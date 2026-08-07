import type {Collection, Db, Document, Filter} from 'mongodb'

export type DashboardRange = '1h' | '6h' | '24h' | '7d' | '30d'
export type DashboardStatus = 'pending' | 'success' | 'error'

const TOPOLOGY_RELATION_LIMIT = 500
const UNKNOWN_PUBLISHER = 'Unknown publisher'

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

async function statusCounts(collection: Collection, queryTimeoutMs: number, match: Document = {}) {
  return await collection
    .aggregate<{_id: string; count: number}>(
      [{$match: match}, {$group: {_id: '$status', count: {$sum: 1}}}],
      {maxTimeMS: queryTimeoutMs},
    )
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
    private readonly queryTimeoutMs: number,
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
    await this.db.command({ping: 1, maxTimeMS: this.queryTimeoutMs})
    return {latencyMs: Math.round((performance.now() - startedAt) * 10) / 10}
  }

  async topology(range: DashboardRange) {
    const now = new Date()
    const start = new Date(now.getTime() - RANGE_MS[range])
    const {events, subscriptions, deliveries} = this.collections
    const publisherFields = ['source', 'producer', 'publisher', 'service', 'app', 'origin']

    const [publisherRows, subscriptionRows, deliveryRows] = await Promise.all([
      events
        .aggregate<{
          _id: {publisher: string; topic: string}
          sourceField: string | null
          events: number
          lastPublishedAt: Date
        }>(
          [
            {$match: {createdAt: {$gte: start}}},
            {
              $project: {
                topic: 1,
                createdAt: 1,
                publisher: {
                  $cond: [
                    {
                      $and: [{$eq: [{$type: '$publisher'}, 'string']}, {$ne: ['$publisher', '']}],
                    },
                    {name: '$publisher', field: 'publisher'},
                    {
                      $switch: {
                        branches: publisherFields.map(field => ({
                          case: {
                            $and: [
                              {$eq: [{$type: `$headers.${field}`}, 'string']},
                              {$ne: [`$headers.${field}`, '']},
                            ],
                          },
                          // biome-ignore lint/suspicious/noThenProperty: MongoDB $switch branches require a then field.
                          then: {name: `$headers.${field}`, field: `headers.${field}`},
                        })),
                        default: {name: UNKNOWN_PUBLISHER, field: null},
                      },
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  publisher: '$publisher.name',
                  topic: '$topic',
                },
                sourceField: {$first: '$publisher.field'},
                events: {$sum: 1},
                lastPublishedAt: {$max: '$createdAt'},
              },
            },
            {$sort: {events: -1}},
            {$limit: TOPOLOGY_RELATION_LIMIT},
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      subscriptions
        .aggregate<{
          _id: {topic: string; consumerGroup: string}
          ordered: boolean
          delivery: string
          offsetReset: string
          maxRetries: number
          updatedAt: Date
          active: boolean
        }>(
          [
            {$sort: {updatedAt: -1}},
            {
              $group: {
                _id: {topic: '$topic', consumerGroup: '$consumerGroup'},
                ordered: {$first: '$ordered'},
                delivery: {$first: '$delivery'},
                offsetReset: {$first: '$offsetReset'},
                maxRetries: {$first: '$maxRetries'},
                updatedAt: {$first: '$updatedAt'},
                active: {$max: {$gt: ['$discoveryLockedUntil', now]}},
              },
            },
            {$sort: {updatedAt: -1}},
            {$limit: TOPOLOGY_RELATION_LIMIT},
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      deliveries
        .aggregate<{
          _id: {topic: string; consumerGroup: string; status: DashboardStatus}
          count: number
          lastActivityAt: Date
        }>(
          [
            {$match: {eventCreatedAt: {$gte: start}}},
            {
              $group: {
                _id: {
                  topic: '$topic',
                  consumerGroup: '$consumerGroup',
                  status: '$status',
                },
                count: {$sum: 1},
                lastActivityAt: {$max: '$updatedAt'},
              },
            },
            {$limit: TOPOLOGY_RELATION_LIMIT * 3},
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
    ])

    const deliveryByRelation = new Map<
      string,
      ReturnType<typeof makeStatusMap> & {lastActivityAt?: Date}
    >()
    for (const row of deliveryRows) {
      const key = `${row._id.topic}\u0000${row._id.consumerGroup}`
      const current = deliveryByRelation.get(key) ?? {...makeStatusMap([])}
      current[row._id.status] = row.count
      if (!current.lastActivityAt || row.lastActivityAt > current.lastActivityAt) {
        current.lastActivityAt = row.lastActivityAt
      }
      deliveryByRelation.set(key, current)
    }

    const publishers = new Map<
      string,
      {
        id: string
        name: string
        sourceField: string | null
        events: number
        topics: number
        lastPublishedAt?: Date
      }
    >()
    const topics = new Map<
      string,
      {
        id: string
        name: string
        events: number
        publishers: number
        consumers: number
        pending: number
        success: number
        error: number
        lastActivityAt?: Date
      }
    >()
    const consumerGroups = new Map<
      string,
      {
        id: string
        name: string
        topics: number
        subscriptions: number
        activeSubscriptions: number
        pending: number
        success: number
        error: number
        lastActivityAt?: Date
      }
    >()
    const edges: Array<Record<string, unknown>> = []
    let knownPublisherEvents = 0
    let totalPublisherEvents = 0

    for (const row of publisherRows) {
      const publisherId = `publisher:${row._id.publisher}`
      const topicId = `topic:${row._id.topic}`
      const publisher = publishers.get(publisherId) ?? {
        id: publisherId,
        name: row._id.publisher,
        sourceField: row.sourceField,
        events: 0,
        topics: 0,
      }
      publisher.events += row.events
      publisher.topics += 1
      if (!publisher.lastPublishedAt || row.lastPublishedAt > publisher.lastPublishedAt) {
        publisher.lastPublishedAt = row.lastPublishedAt
      }
      publishers.set(publisherId, publisher)

      const topic = topics.get(topicId) ?? {
        id: topicId,
        name: row._id.topic,
        events: 0,
        publishers: 0,
        consumers: 0,
        pending: 0,
        success: 0,
        error: 0,
      }
      topic.events += row.events
      topic.publishers += 1
      if (!topic.lastActivityAt || row.lastPublishedAt > topic.lastActivityAt) {
        topic.lastActivityAt = row.lastPublishedAt
      }
      topics.set(topicId, topic)

      totalPublisherEvents += row.events
      if (row._id.publisher !== UNKNOWN_PUBLISHER) knownPublisherEvents += row.events
      edges.push({
        id: `${publisherId}->${topicId}`,
        source: publisherId,
        target: topicId,
        kind: 'publishes',
        events: row.events,
        lastActivityAt: row.lastPublishedAt,
      })
    }

    for (const row of subscriptionRows) {
      const topicId = `topic:${row._id.topic}`
      const consumerId = `consumer:${row._id.consumerGroup}`
      const relationKey = `${row._id.topic}\u0000${row._id.consumerGroup}`
      const status: ReturnType<typeof makeStatusMap> & {lastActivityAt?: Date} =
        deliveryByRelation.get(relationKey) ?? makeStatusMap([])
      const topic = topics.get(topicId) ?? {
        id: topicId,
        name: row._id.topic,
        events: 0,
        publishers: 0,
        consumers: 0,
        pending: 0,
        success: 0,
        error: 0,
      }
      topic.consumers += 1
      topic.pending += status.pending
      topic.success += status.success
      topic.error += status.error
      if (
        status.lastActivityAt &&
        (!topic.lastActivityAt || status.lastActivityAt > topic.lastActivityAt)
      ) {
        topic.lastActivityAt = status.lastActivityAt
      }
      topics.set(topicId, topic)

      const consumer = consumerGroups.get(consumerId) ?? {
        id: consumerId,
        name: row._id.consumerGroup,
        topics: 0,
        subscriptions: 0,
        activeSubscriptions: 0,
        pending: 0,
        success: 0,
        error: 0,
      }
      consumer.topics += 1
      consumer.subscriptions += 1
      if (row.active) consumer.activeSubscriptions += 1
      consumer.pending += status.pending
      consumer.success += status.success
      consumer.error += status.error
      if (
        status.lastActivityAt &&
        (!consumer.lastActivityAt || status.lastActivityAt > consumer.lastActivityAt)
      ) {
        consumer.lastActivityAt = status.lastActivityAt
      }
      consumerGroups.set(consumerId, consumer)

      edges.push({
        id: `${topicId}->${consumerId}`,
        source: topicId,
        target: consumerId,
        kind: 'subscribes',
        ...status,
        active: row.active,
        ordered: row.ordered,
        delivery: row.delivery,
        offsetReset: row.offsetReset,
        maxRetries: row.maxRetries,
        updatedAt: row.updatedAt,
      })
    }

    return {
      generatedAt: now,
      database: this.databaseName,
      collectionPrefix: this.collectionPrefix,
      range,
      summary: {
        publishers: publishers.size,
        topics: topics.size,
        consumerGroups: consumerGroups.size,
        relationships: edges.length,
        sourceCoverage:
          totalPublisherEvents === 0 ? 0 : knownPublisherEvents / totalPublisherEvents,
      },
      publishers: [...publishers.values()].sort((a, b) => b.events - a.events),
      topics: [...topics.values()].sort((a, b) => b.events - a.events),
      consumerGroups: [...consumerGroups.values()].sort(
        (a, b) => b.pending + b.error - (a.pending + a.error),
      ),
      edges,
      truncated:
        publisherRows.length === TOPOLOGY_RELATION_LIMIT ||
        subscriptionRows.length === TOPOLOGY_RELATION_LIMIT,
    }
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
      events.estimatedDocumentCount({maxTimeMS: this.queryTimeoutMs}),
      subscriptions.estimatedDocumentCount({maxTimeMS: this.queryTimeoutMs}),
      statusCounts(deliveries, this.queryTimeoutMs),
      statusCounts(history, this.queryTimeoutMs),
      Promise.all([
        history.countDocuments(
          {status: 'pending', lockedUntil: {$gt: now}},
          {maxTimeMS: this.queryTimeoutMs},
        ),
        history.countDocuments(
          {status: 'pending', lockedUntil: {$lte: now}},
          {maxTimeMS: this.queryTimeoutMs},
        ),
        history.countDocuments(
          {status: 'pending', lockedUntil: {$exists: false}},
          {maxTimeMS: this.queryTimeoutMs},
        ),
      ]),
      deliveries.findOne(
        {status: 'pending'},
        {sort: {eventCreatedAt: 1, eventId: 1}, maxTimeMS: this.queryTimeoutMs},
      ),
      history
        .find({status: 'error'}, {maxTimeMS: this.queryTimeoutMs})
        .sort({endedAt: -1, createdAt: -1})
        .limit(8)
        .toArray(),
      events
        .aggregate<{_id: string; count: number; lastEventAt: Date}>(
          [
            {$group: {_id: '$topic', count: {$sum: 1}, lastEventAt: {$max: '$createdAt'}}},
            {$sort: {count: -1}},
            {$limit: 100},
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      deliveries
        .aggregate<{
          _id: {topic: string; status: DashboardStatus}
          count: number
          lastActivityAt: Date
        }>(
          [
            {
              $group: {
                _id: {topic: '$topic', status: '$status'},
                count: {$sum: 1},
                lastActivityAt: {$max: '$updatedAt'},
              },
            },
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      deliveries
        .aggregate<{
          _id: {consumerGroup: string; status: DashboardStatus}
          count: number
          lastActivityAt: Date
        }>(
          [
            {
              $group: {
                _id: {consumerGroup: '$consumerGroup', status: '$status'},
                count: {$sum: 1},
                lastActivityAt: {$max: '$updatedAt'},
              },
            },
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      events
        .aggregate<{_id: Date; count: number}>(
          [
            {$match: {createdAt: {$gte: start}}},
            {
              $group: {
                _id: {$dateTrunc: {date: '$createdAt', unit: bucket.unit, binSize: bucket.binSize}},
                count: {$sum: 1},
              },
            },
            {$sort: {_id: 1}},
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
        .toArray(),
      history
        .aggregate<{_id: {bucket: Date; status: DashboardStatus}; count: number}>(
          [
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
          ],
          {maxTimeMS: this.queryTimeoutMs},
        )
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
      this.collections.deliveries.countDocuments(filter, {maxTimeMS: this.queryTimeoutMs}),
      this.collections.deliveries
        .find(filter, {maxTimeMS: this.queryTimeoutMs})
        .sort({updatedAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = documents.map(document => document.eventId)
    const events = await this.collections.events
      .find({_id: {$in: eventIds}}, {maxTimeMS: this.queryTimeoutMs})
      .toArray()
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
      this.collections.history.countDocuments(filter, {maxTimeMS: this.queryTimeoutMs}),
      this.collections.history
        .find(filter, {maxTimeMS: this.queryTimeoutMs})
        .sort({createdAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = [...new Set(documents.map(document => document.eventId))]
    const events = await this.collections.events
      .find({_id: {$in: eventIds}}, {maxTimeMS: this.queryTimeoutMs})
      .toArray()
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
      this.collections.events.countDocuments(filter, {maxTimeMS: this.queryTimeoutMs}),
      this.collections.events
        .find(filter, {maxTimeMS: this.queryTimeoutMs})
        .sort({createdAt: -1, _id: -1})
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
    ])
    const eventIds = documents.map(document => String(document._id))
    const deliveryRows = await this.collections.deliveries
      .aggregate<{_id: {eventId: string; status: DashboardStatus}; count: number}>(
        [
          {$match: {eventId: {$in: eventIds}}},
          {$group: {_id: {eventId: '$eventId', status: '$status'}, count: {$sum: 1}}},
        ],
        {maxTimeMS: this.queryTimeoutMs},
      )
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
      this.collections.subscriptions.countDocuments(filter, {maxTimeMS: this.queryTimeoutMs}),
      this.collections.subscriptions
        .find(filter, {maxTimeMS: this.queryTimeoutMs})
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
