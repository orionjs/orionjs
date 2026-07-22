import type {Document} from 'mongodb'

export type PulseEventMap = Record<string, unknown>
export type PulseTopic<TEvents extends PulseEventMap> = Extract<keyof TEvents, string>
export type PulseHeaders = Record<string, string>
export type PulseChangeStreamsMode = 'auto' | 'required' | 'disabled'
export type PulseDeliveryMode = 'at-least-once' | 'at-most-once'
export type PulseOffsetReset = 'latest' | 'earliest'
export type PulseHistoryStatus = 'pending' | 'success' | 'error'
export type PulseLockState = 'queued' | 'active' | 'expired'

export interface PulseConnectOptions {
  connectionString: string
  consumerGroup: string
  databaseName?: string
  collectionPrefix?: string
  changeStreams?: PulseChangeStreamsMode
  eventRetentionMs?: number | null
  historyRetentionMs?: number | null
  pollIntervalMs?: number
  workerCount?: number
  lockTimeoutMs?: number
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
  ordered?: boolean
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
  headers?: PulseHeaders
  createdAt: Date
  expiresAt?: Date
}

export interface SubscriptionDocument extends Document {
  _id: string
  consumerGroup: string
  topic: string
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
  status: DeliveryStatus
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  expiresAt?: Date
  finalAttempt?: number
  error?: PulseHistoryError
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
}

export interface ResolvedSubscribeOptions {
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
  handler: PulseEventHandler<string, unknown>
  running: number
  unsubscribed: boolean
}
