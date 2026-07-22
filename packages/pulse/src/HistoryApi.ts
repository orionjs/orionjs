import type {Filter} from 'mongodb'
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
    const documents = await this.getCollections()
      .history.find(filter)
      .sort({_id: -1})
      .limit(limit + 1)
      .toArray()
    const hasMore = documents.length > limit
    const records = documents.slice(0, limit).map(toPublicRecord)

    return {
      records,
      nextCursor: hasMore ? records.at(-1)?.id : undefined,
    }
  }
}
