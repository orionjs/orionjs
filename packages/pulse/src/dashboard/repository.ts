import type {Collection, Db, Document, Filter} from 'mongodb'

export type DashboardRange = '1h' | '6h' | '24h' | '7d' | '30d'
export type DashboardStatus = 'pending' | 'success' | 'error'

export interface DashboardQuery {
  page: number
  limit: number
  topic?: string
  consumerGroup?: string
  status?: DashboardStatus
  search?: string
  lockState?: 'queued' | 'active' | 'expired'
}

interface DashboardCollections {
  events: Collection
  subscriptions: Collection
  deliveries: Collection
  history: Collection
}

const RANGE_MS: Record<DashboardRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

const RANGE_BUCKETS: Record<DashboardRange, {unit: string; binSize: number; milliseconds: number}> =
  {
    '1h': {unit: 'minute', binSize: 5, milliseconds: 5 * 60 * 1000},
    '6h': {unit: 'minute', binSize: 30, milliseconds: 30 * 60 * 1000},
    '24h': {unit: 'hour', binSize: 1, milliseconds: 60 * 60 * 1000},
    '7d': {unit: 'hour', binSize: 6, milliseconds: 6 * 60 * 60 * 1000},
    '30d': {unit: 'day', binSize: 1, milliseconds: 24 * 60 * 60 * 1000},
  }

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function makeStatusMap(rows: Array<{_id: string; count: number}>) {
  const result = {pending: 0, success: 0, error: 0}
  for (const row of rows) {
    if (row._id in result) result[row._id as DashboardStatus] = row.count
  }
  return result
}

function toPublicDocument(document: Document) {
  const {_id, ...rest} = document
  return {id: String(_id), ...rest}
}

async function statusCounts(collection: Collection, match: Document = {}) {
  return await collection
    .aggregate<{_id: string; count: number}>([
      {$match: match},
      {$group: {_id: '$status', count: {$sum: 1}}},
    ])
    .toArray()
}

export function resolveDashboardRange(value: string | null): DashboardRange {
  return value && value in RANGE_MS ? (value as DashboardRange) : '24h'
}

export class DashboardRepository {
  readonly databaseName: string
  readonly collectionPrefix: string
  private readonly collections: DashboardCollections

  constructor(
    private readonly db: Db,
    collectionPrefix: string,
  ) {
    this.databaseName = db.databaseName
    this.collectionPrefix = collectionPrefix
    this.collections = {
      events: db.collection(`${collectionPrefix}.events`),
      subscriptions: db.collection(`${collectionPrefix}.subscriptions`),
      deliveries: db.collection(`${collectionPrefix}.deliveries`),
      history: db.collection(`${collectionPrefix}.history`),
    }
  }

  async ping() {
    const startedAt = performance.now()
    await this.db.command({ping: 1})
    return {latencyMs: Math.round((performance.now() - startedAt) * 10) / 10}
  }

  async overview(range: DashboardRange) {
    const now = new Date()
    const start = new Date(now.getTime() - RANGE_MS[range])
    const bucket = RANGE_BUCKETS[range]
    const {events, subscriptions, deliveries, history} = this.collections

    const [
      eventCount,
      subscriptionCount,
      deliveryRows,
      historyRows,
      lockRows,
      oldestPending,
      recentErrors,
      eventTopicRows,
      deliveryTopicRows,
      groupRows,
      publishedTimeline,
      attemptTimeline,
      ping,
    ] = await Promise.all([
      events.estimatedDocumentCount(),
      subscriptions.estimatedDocumentCount(),
      statusCounts(deliveries),
      statusCounts(history),
      Promise.all([
        history.countDocuments({status: 'pending', lockedUntil: {$gt: now}}),
        history.countDocuments({status: 'pending', lockedUntil: {$lte: now}}),
        history.countDocuments({status: 'pending', lockedUntil: {$exists: false}}),
      ]),
      deliveries.findOne({status: 'pending'}, {sort: {eventCreatedAt: 1, eventId: 1}}),
      history.find({status: 'error'}).sort({endedAt: -1, createdAt: -1}).limit(8).toArray(),
      events
        .aggregate<{_id: string; count: number; lastEventAt: Date}>([
          {$group: {_id: '$topic', count: {$sum: 1}, lastEventAt: {$max: '$createdAt'}}},
          {$sort: {count: -1}},
          {$limit: 100},
        ])
        .toArray(),
      deliveries
        .aggregate<{
          _id: {topic: string; status: DashboardStatus}
          count: number
          lastActivityAt: Date
        }>([
          {
            $group: {
              _id: {topic: '$topic', status: '$status'},
              count: {$sum: 1},
              lastActivityAt: {$max: '$updatedAt'},
            },
          },
        ])
        .toArray(),
      deliveries
        .aggregate<{
          _id: {consumerGroup: string; status: DashboardStatus}
          count: number
          lastActivityAt: Date
        }>([
          {
            $group: {
              _id: {consumerGroup: '$consumerGroup', status: '$status'},
              count: {$sum: 1},
              lastActivityAt: {$max: '$updatedAt'},
            },
          },
        ])
        .toArray(),
      events
        .aggregate<{_id: Date; count: number}>([
          {$match: {createdAt: {$gte: start}}},
          {
            $group: {
              _id: {$dateTrunc: {date: '$createdAt', unit: bucket.unit, binSize: bucket.binSize}},
              count: {$sum: 1},
            },
          },
          {$sort: {_id: 1}},
        ])
        .toArray(),
      history
        .aggregate<{_id: {bucket: Date; status: DashboardStatus}; count: number}>([
          {$match: {endedAt: {$gte: start}, status: {$in: ['success', 'error']}}},
          {
            $group: {
              _id: {
                bucket: {
                  $dateTrunc: {date: '$endedAt', unit: bucket.unit, binSize: bucket.binSize},
                },
                status: '$status',
              },
              count: {$sum: 1},
            },
          },
          {$sort: {'_id.bucket': 1}},
        ])
        .toArray(),
      this.ping(),
    ])

    const deliveryStatus = makeStatusMap(deliveryRows)
    const attemptStatus = makeStatusMap(historyRows)
    const timelineMap = new Map<
      number,
      {timestamp: string; published: number; success: number; error: number}
    >()
    const firstBucket = Math.floor(start.getTime() / bucket.milliseconds) * bucket.milliseconds
    for (
      let timestamp = firstBucket;
      timestamp <= now.getTime();
      timestamp += bucket.milliseconds
    ) {
      timelineMap.set(timestamp, {
        timestamp: new Date(timestamp).toISOString(),
        published: 0,
        success: 0,
        error: 0,
      })
    }
    for (const row of publishedTimeline) {
      const timestamp = row._id.getTime()
      const item = timelineMap.get(timestamp)
      if (item) item.published = row.count
    }
    for (const row of attemptTimeline) {
      const timestamp = row._id.bucket.getTime()
      const item = timelineMap.get(timestamp)
      if (item && row._id.status !== 'pending') item[row._id.status] = row.count
    }

    const topics = new Map<
      string,
      {
        topic: string
        events: number
        pending: number
        success: number
        error: number
        lastActivityAt?: Date
      }
    >()
    for (const row of eventTopicRows) {
      topics.set(row._id, {
        topic: row._id,
        events: row.count,
        pending: 0,
        success: 0,
        error: 0,
        lastActivityAt: row.lastEventAt,
      })
    }
    for (const row of deliveryTopicRows) {
      const current = topics.get(row._id.topic) ?? {
        topic: row._id.topic,
        events: 0,
        pending: 0,
        success: 0,
        error: 0,
      }
      current[row._id.status] = row.count
      if (!current.lastActivityAt || row.lastActivityAt > current.lastActivityAt) {
        current.lastActivityAt = row.lastActivityAt
      }
      topics.set(row._id.topic, current)
    }

    const consumerGroups = new Map<
      string,
      {
        consumerGroup: string
        pending: number
        success: number
        error: number
        lastActivityAt?: Date
      }
    >()
    for (const row of groupRows) {
      const current = consumerGroups.get(row._id.consumerGroup) ?? {
        consumerGroup: row._id.consumerGroup,
        pending: 0,
        success: 0,
        error: 0,
      }
      current[row._id.status] = row.count
      if (!current.lastActivityAt || row.lastActivityAt > current.lastActivityAt) {
        current.lastActivityAt = row.lastActivityAt
      }
      consumerGroups.set(row._id.consumerGroup, current)
    }

    const completedInRange = attemptTimeline.reduce((total, row) => total + row.count, 0)
    const errorsInRange = attemptTimeline
      .filter(row => row._id.status === 'error')
      .reduce((total, row) => total + row.count, 0)
    const errorRate = completedInRange === 0 ? 0 : errorsInRange / completedInRange
    const oldestPendingMs = oldestPending
      ? Math.max(0, now.getTime() - new Date(oldestPending.eventCreatedAt).getTime())
      : 0
    const health =
      lockRows[1] > 0 || errorRate >= 0.2
        ? 'critical'
        : deliveryStatus.error > 0 || oldestPendingMs > 60_000
          ? 'attention'
          : 'healthy'

    return {
      generatedAt: now,
      database: this.databaseName,
      collectionPrefix: this.collectionPrefix,
      range,
      ping,
      health: {
        status: health,
        errorRate,
        oldestPendingMs,
      },
      totals: {
        events: eventCount,
        subscriptions: subscriptionCount,
        deliveries: deliveryStatus.pending + deliveryStatus.success + deliveryStatus.error,
        attempts: attemptStatus.pending + attemptStatus.success + attemptStatus.error,
      },
      deliveryStatus,
      attemptStatus,
      locks: {active: lockRows[0], expired: lockRows[1], queued: lockRows[2]},
      timeline: [...timelineMap.values()],
      topics: [...topics.values()].sort((a, b) => b.events - a.events),
      consumerGroups: [...consumerGroups.values()].sort(
        (a, b) => b.pending + b.error - (a.pending + a.error),
      ),
      recentErrors: recentErrors.map(toPublicDocument),
    }
  }

  async deliveries(query: DashboardQuery) {
    const filter: Filter<Document> = {}
    if (query.status) filter.status = query.status
    if (query.topic) filter.topic = query.topic
    if (query.consumerGroup) filter.consumerGroup = query.consumerGroup
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{eventId: regex}, {topic: regex}, {consumerGroup: regex}]
    }

    const [total, documents] = await Promise.all([
      this.collections.deliveries.countDocuments(filter),
      this.collections.deliveries
        .find(filter)
        .sort({updatedAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = documents.map(document => document.eventId)
    const events = await this.collections.events.find({_id: {$in: eventIds}}).toArray()
    const eventMap = new Map(events.map(event => [String(event._id), toPublicDocument(event)]))

    return this.page(
      documents.map(document => ({
        ...toPublicDocument(document),
        event: eventMap.get(String(document.eventId)),
      })),
      total,
      query,
    )
  }

  async history(query: DashboardQuery) {
    const filter: Filter<Document> = {}
    if (query.status) filter.status = query.status
    if (query.topic) filter.topic = query.topic
    if (query.consumerGroup) filter.consumerGroup = query.consumerGroup
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [
        {eventId: regex},
        {deliveryId: regex},
        {topic: regex},
        {consumerGroup: regex},
        {'error.message': regex},
      ]
    }
    if (query.lockState) {
      filter.status = 'pending'
      const now = new Date()
      filter.lockedUntil =
        query.lockState === 'queued'
          ? {$exists: false}
          : query.lockState === 'active'
            ? {$gt: now}
            : {$lte: now}
    }

    const [total, documents] = await Promise.all([
      this.collections.history.countDocuments(filter),
      this.collections.history
        .find(filter)
        .sort({createdAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = [...new Set(documents.map(document => document.eventId))]
    const events = await this.collections.events.find({_id: {$in: eventIds}}).toArray()
    const eventMap = new Map(events.map(event => [String(event._id), toPublicDocument(event)]))

    return this.page(
      documents.map(document => ({
        ...toPublicDocument(document),
        lockState:
          document.status !== 'pending'
            ? undefined
            : !document.lockedUntil
              ? 'queued'
              : document.lockedUntil > new Date()
                ? 'active'
                : 'expired',
        event: eventMap.get(String(document.eventId)),
      })),
      total,
      query,
    )
  }

  async events(query: DashboardQuery) {
    const filter: Filter<Document> = {}
    if (query.topic) filter.topic = query.topic
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{_id: regex}, {topic: regex}]
    }

    const [total, documents] = await Promise.all([
      this.collections.events.countDocuments(filter),
      this.collections.events
        .find(filter)
        .sort({createdAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = documents.map(document => String(document._id))
    const deliveryRows = await this.collections.deliveries
      .aggregate<{_id: {eventId: string; status: DashboardStatus}; count: number}>([
        {$match: {eventId: {$in: eventIds}}},
        {$group: {_id: {eventId: '$eventId', status: '$status'}, count: {$sum: 1}}},
      ])
      .toArray()
    const deliveriesByEvent = new Map<string, ReturnType<typeof makeStatusMap>>()
    for (const row of deliveryRows) {
      const status = deliveriesByEvent.get(row._id.eventId) ?? makeStatusMap([])
      status[row._id.status] = row.count
      deliveriesByEvent.set(row._id.eventId, status)
    }

    return this.page(
      documents.map(document => ({
        ...toPublicDocument(document),
        deliveries: deliveriesByEvent.get(String(document._id)) ?? makeStatusMap([]),
      })),
      total,
      query,
    )
  }

  async subscriptions(query: DashboardQuery) {
    const filter: Filter<Document> = {}
    if (query.topic) filter.topic = query.topic
    if (query.consumerGroup) filter.consumerGroup = query.consumerGroup
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{topic: regex}, {consumerGroup: regex}]
    }

    const [total, documents] = await Promise.all([
      this.collections.subscriptions.countDocuments(filter),
      this.collections.subscriptions
        .find(filter)
        .sort({updatedAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const now = new Date()
    return this.page(
      documents.map(document => ({
        ...toPublicDocument(document),
        orderedLease:
          document.orderedLockedUntil && document.orderedLockedUntil > now ? 'active' : 'idle',
        discoveryLease:
          document.discoveryLockedUntil && document.discoveryLockedUntil > now ? 'active' : 'idle',
      })),
      total,
      query,
    )
  }

  private page(items: Document[], total: number, query: DashboardQuery) {
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }
}
