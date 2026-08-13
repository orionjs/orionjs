import type {Document, Filter} from 'mongodb'
import type {PulseCollections} from './indexes'
import type {
  HistoryDocument,
  PulseHistoryApi,
  PulseHistoryFindOptions,
  PulseHistoryFindResult,
  PulseHistoryRecord,
  PulseLockState,
} from './types'

function getLockState(record: HistoryDocument, now = new Date()): PulseLockState | undefined {
  if (record.status !== 'pending') return undefined
  if (!record.lockedUntil) return 'queued'
  return record.lockedUntil.getTime() <= now.getTime() ? 'expired' : 'active'
}

function toPublicRecord(record: HistoryDocument): PulseHistoryRecord {
  return {
    id: record._id,
    deliveryId: record.deliveryId,
    eventId: record.eventId,
    consumerGroup: record.consumerGroup,
    topic: record.topic,
    attempt: record.attempt,
    status: record.status,
    lockState: getLockState(record),
    createdAt: record.createdAt,
    nextAttemptAt: record.nextAttemptAt,
    startedAt: record.startedAt,
    lockedAt: record.lockedAt,
    lockedUntil: record.lockedUntil,
    heartbeatAt: record.heartbeatAt,
    lockOwner: record.lockOwner,
    lockToken: record.lockToken,
    endedAt: record.endedAt,
    durationMs: record.durationMs,
    expiresAt: record.expiresAt,
    error: record.error,
  }
}

export class HistoryApi implements PulseHistoryApi {
  constructor(
    private readonly awaitReady: () => Promise<void>,
    private readonly getCollections: () => PulseCollections,
  ) {}

  async find(options: PulseHistoryFindOptions = {}): Promise<PulseHistoryFindResult> {
    await this.awaitReady()

    const now = new Date()
    const filter: Filter<HistoryDocument> = {}
    if (options.topic) filter.topic = options.topic
    if (options.eventId) filter.eventId = options.eventId
    if (options.consumerGroup) filter.consumerGroup = options.consumerGroup
    if (options.status) filter.status = options.status
    if (options.cursor) filter._id = {$lt: options.cursor}
    if (options.from || options.to) {
      filter.createdAt = {
        ...(options.from ? {$gte: options.from} : {}),
        ...(options.to ? {$lte: options.to} : {}),
      }
    }

    if (options.lockState) {
      filter.status = 'pending'
      if (options.lockState === 'queued') {
        filter.lockedUntil = {$exists: false}
      } else if (options.lockState === 'active') {
        filter.lockedUntil = {$gt: now}
      } else {
        filter.lockedUntil = {$lte: now}
      }
    }

    const limit = Math.max(1, Math.min(options.limit ?? 100, 500))
    const [legacyDocuments, embeddedDocuments] = await Promise.all([
      this.getCollections()
        .history.find(filter)
        .sort({_id: -1})
        .limit(limit + 1)
        .toArray(),
      this.findEmbedded(options, limit + 1, now),
    ])
    const documents = [...legacyDocuments, ...embeddedDocuments]
      .sort((first, second) => second._id.localeCompare(first._id))
      .slice(0, limit + 1)
    const hasMore = documents.length > limit
    const records = documents.slice(0, limit).map(toPublicRecord)

    return {
      records,
      nextCursor: hasMore ? records.at(-1)?.id : undefined,
    }
  }

  private async findEmbedded(
    options: PulseHistoryFindOptions,
    limit: number,
    now: Date,
  ): Promise<HistoryDocument[]> {
    const subscriptionFilter: Document = {embeddedExecutionSeen: true}
    if (options.topic) subscriptionFilter.topic = options.topic
    if (options.consumerGroup) subscriptionFilter.consumerGroup = options.consumerGroup
    const embeddedExecutionWasEnabled = await this.getCollections().subscriptions.findOne(
      subscriptionFilter,
      {projection: {_id: 1}},
    )
    if (!embeddedExecutionWasEnabled) return []

    const deliveryMatch: Document = {
      executionVersion: 2,
      status: {$in: ['v2-pending', 'v2-processing', 'v2-success', 'v2-error']},
    }
    if (options.topic) deliveryMatch.topic = options.topic
    if (options.eventId) deliveryMatch.eventId = options.eventId
    if (options.consumerGroup) deliveryMatch.consumerGroup = options.consumerGroup

    const recordMatch: Document = {}
    if (options.status) recordMatch.status = options.status
    if (options.cursor) recordMatch._id = {$lt: options.cursor}
    if (options.from || options.to) {
      recordMatch.createdAt = {
        ...(options.from ? {$gte: options.from} : {}),
        ...(options.to ? {$lte: options.to} : {}),
      }
    }
    if (options.lockState) {
      recordMatch.status = 'pending'
      if (options.lockState === 'queued') recordMatch.lockedUntil = {$exists: false}
      else if (options.lockState === 'active') recordMatch.lockedUntil = {$gt: now}
      else recordMatch.lockedUntil = {$lte: now}
    }

    const commonFields = {
      deliveryId: '$_id',
      eventId: '$eventId',
      consumerGroup: '$consumerGroup',
      topic: '$topic',
      expiresAt: '$expiresAt',
    }
    const pendingRecord = {
      _id: '$attemptId',
      ...commonFields,
      attempt: {
        $cond: [{$eq: ['$status', 'v2-processing']}, '$attempt', {$add: ['$attempt', 1]}],
      },
      status: 'pending',
      createdAt: '$attemptCreatedAt',
      nextAttemptAt: '$nextAttemptAt',
      startedAt: '$startedAt',
      lockedAt: '$lockedAt',
      lockedUntil: '$lockedUntil',
      heartbeatAt: '$heartbeatAt',
      lockOwner: '$lockOwner',
      lockToken: '$lockToken',
    }

    return await this.getCollections()
      .deliveries.aggregate<HistoryDocument>([
        {$match: deliveryMatch},
        {
          $project: {
            records: {
              $concatArrays: [
                {
                  $map: {
                    input: {$ifNull: ['$attempts', []]},
                    as: 'attempt',
                    in: {$mergeObjects: ['$$attempt', commonFields]},
                  },
                },
                {
                  $cond: [{$in: ['$status', ['v2-pending', 'v2-processing']]}, [pendingRecord], []],
                },
              ],
            },
          },
        },
        {$unwind: '$records'},
        {$replaceWith: '$records'},
        {$match: recordMatch},
        {$sort: {_id: -1}},
        {$limit: limit},
      ])
      .toArray()
  }
}
