import type {Document, Timestamp} from 'mongodb'

export type PulseEventMap = Record<string, unknown>
export type PulseTopic<TEvents extends PulseEventMap> = Extract<keyof TEvents, string>
export type PulseHeaders = Record<string, string>
export type PulseDeliveryMode = 'at-least-once' | 'at-most-once'
export type PulseOffsetReset = 'latest' | 'earliest'
export type PulseHistoryStatus = 'pending' | 'success' | 'error'
export type PulseLockState = 'queued' | 'active' | 'expired'

export interface PulseConnectOptions {
  connectionString: string
  consumerGroup: string
  databaseName?: string
  collectionPrefix?: string
  eventRetentionMs?: number | null
  historyRetentionMs?: number | null
  pollIntervalMs?: number
  workerCount?: number
  maxPoolSize?: number
  maxIdleTimeMS?: number
  lockTimeoutMs?: number
  discoveryLockTimeoutMs?: number
  onError?: (error: Error) => void
}

export interface PulsePublishOptions<TTopic extends string = string, TData = unknown> {
  topic: TTopic
  data: TData
  headers?: PulseHeaders
}

export interface PulsePublishedEvent<TTopic extends string = string, TData = unknown> {
  id: string
  topic: TTopic
  data: TData
  /** Consumer group of the Pulse instance that published this event. */
  publisher?: string
  headers?: PulseHeaders
  createdAt: Date
  expiresAt?: Date
}

export interface PulseReceivedEvent<TTopic extends string = string, TData = unknown>
  extends PulsePublishedEvent<TTopic, TData> {
  consumerGroup: string
  attempt: number
}

export interface PulseSubscribeOptions {
  /** Defaults to false. */
  ordered?: boolean
  /**
   * Integer version for persisted subscription settings. Higher versions win.
   * Legacy and omitted versions are treated as zero.
   */
  configVersion?: number
  offsetReset?: PulseOffsetReset
  delivery?: PulseDeliveryMode
  maxRetries?: number
  retryDelayMs?: number
  retryBackoffMultiplier?: number
  maxConcurrency?: number
}

export type PulseEventHandler<TTopic extends string = string, TData = unknown> = (
  event: PulseReceivedEvent<TTopic, TData>,
) => Promise<void> | void

export interface PulseSubscriptionInfo {
  id: string
  topic: string
  consumerGroup: string
  configVersion: number
  ordered: boolean
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  maxConcurrency: number
}

export interface PulseSubscription extends PulseSubscriptionInfo {
  unsubscribe(): Promise<void>
}

export interface PulseHistoryError {
  code: string
  name: string
  message: string
  stack?: string
}

export interface PulseHistoryRecord {
  id: string
  deliveryId: string
  eventId: string
  consumerGroup: string
  topic: string
  attempt: number
  status: PulseHistoryStatus
  lockState?: PulseLockState
  createdAt: Date
  nextAttemptAt: Date
  startedAt?: Date
  lockedAt?: Date
  lockedUntil?: Date
  heartbeatAt?: Date
  lockOwner?: string
  lockToken?: string
  endedAt?: Date
  durationMs?: number
  expiresAt?: Date
  error?: PulseHistoryError
}

export interface PulseHistoryFindOptions {
  topic?: string
  eventId?: string
  consumerGroup?: string
  status?: PulseHistoryStatus
  lockState?: PulseLockState
  from?: Date
  to?: Date
  cursor?: string
  limit?: number
}

export interface PulseHistoryFindResult {
  records: PulseHistoryRecord[]
  nextCursor?: string
}

export interface PulseHistoryApi {
  find(options?: PulseHistoryFindOptions): Promise<PulseHistoryFindResult>
}

export interface EventDocument<TData = unknown> extends Document {
  _id: string
  topic: string
  data: TData
  /** Missing only on events written before publisher identity was persisted. */
  publisher?: string
  headers?: PulseHeaders
  createdAt: Date
  /**
   * MongoDB-assigned ordering token. Legacy events may not have one.
   */
  sequence?: Timestamp
  expiresAt?: Date
}

export interface SubscriptionDocument extends Document {
  _id: string
  consumerGroup: string
  topic: string
  configVersion?: number
  ordered: boolean
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  createdAt: Date
  updatedAt: Date
  cursorCreatedAt?: Date
  cursorEventId?: string
  cursorSequence?: Timestamp
  cursorSequenceEventId?: string
  discoveryLockOwner?: string
  discoveryLockToken?: string
  discoveryLockedUntil?: Date
  orderedLockOwner?: string
  orderedLockToken?: string
  orderedLockedUntil?: Date
}

export type DeliveryStatus = 'pending' | 'success' | 'error'

export interface DeliveryDocument extends Document {
  _id: string
  eventId: string
  consumerGroup: string
  topic: string
  eventCreatedAt: Date
  eventSequence?: Timestamp
  status: DeliveryStatus
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  expiresAt?: Date
  finalAttempt?: number
  error?: PulseHistoryError
  /** Internal crash-recovery marker. Present only while a cross-collection write is incomplete. */
  needsReconciliation?: true
}

export interface HistoryDocument extends Document {
  _id: string
  deliveryId: string
  eventId: string
  consumerGroup: string
  topic: string
  attempt: number
  status: PulseHistoryStatus
  createdAt: Date
  nextAttemptAt: Date
  startedAt?: Date
  lockOwner?: string
  lockToken?: string
  lockedAt?: Date
  lockedUntil?: Date
  heartbeatAt?: Date
  endedAt?: Date
  durationMs?: number
  expiresAt?: Date
  error?: PulseHistoryError
  /** Internal crash-recovery marker. Present only while its delivery still needs an update. */
  needsReconciliation?: true
}

export interface ResolvedSubscribeOptions {
  configVersion: number
  ordered: boolean
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  maxConcurrency: number
}

export interface LocalSubscription {
  document: SubscriptionDocument
  options: ResolvedSubscribeOptions
  configuredMaxConcurrency: number
  handler: PulseEventHandler<string, unknown>
  running: number
  unsubscribed: boolean
}
