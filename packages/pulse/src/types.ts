import type {Document, Timestamp} from 'mongodb'

export type PulseEventMap = Record<string, unknown>
export type PulseTopic<TEvents extends PulseEventMap> = Extract<keyof TEvents, string>
export type PulseHeaders = Record<string, string>
export type PulseDeliveryMode = 'at-least-once' | 'at-most-once'
export type PulseOffsetReset = 'latest' | 'earliest'
export type PulseReceiverMode = 'single' | 'batch'

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

export interface PulseBatchSubscribeOptions extends PulseSubscribeOptions {
  /** Maximum number of events delivered to one batch handler invocation. */
  batchSize: number
}

export type PulseEventHandler<TTopic extends string = string, TData = unknown> = (
  event: PulseReceivedEvent<TTopic, TData>,
) => Promise<void> | void

export type PulseBatchEventHandler<TTopic extends string = string, TData = unknown> = (
  events: PulseReceivedEvent<TTopic, TData>[],
) => Promise<void> | void

export interface PulseSubscriptionInfo {
  id: string
  topic: string
  consumerGroup: string
  configVersion: number
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  maxConcurrency: number
  receiverMode: PulseReceiverMode
  batchSize: number
}

export interface PulseSubscription extends PulseSubscriptionInfo {
  unsubscribe(): Promise<void>
}

export interface PulseExecutionError {
  code: string
  name: string
  message: string
  stack?: string
}

export interface EventDocument<TData = unknown> extends Document {
  _id: string
  topic: string
  data: TData
  /** Missing only on events written before publisher identity was persisted. */
  publisher?: string
  headers?: PulseHeaders
  createdAt: Date
  /** MongoDB-assigned ordering token. */
  sequence: Timestamp
  expiresAt?: Date
}

export interface SubscriptionDocument extends Document {
  _id: string
  consumerGroup: string
  topic: string
  configVersion?: number
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  receiverMode?: PulseReceiverMode
  batchSize?: number
  createdAt: Date
  updatedAt: Date
  cursorSequence?: Timestamp
  cursorSequenceEventId?: string
  discoveryLockOwner?: string
  discoveryLockToken?: string
  discoveryLockedUntil?: Date
}

export type ConcurrentDeliveryStatus = 'v2-pending' | 'v2-processing' | 'v2-success' | 'v2-error'

export interface DeliveryAttemptDocument {
  _id: string
  attempt: number
  status: 'success' | 'error'
  createdAt: Date
  nextAttemptAt: Date
  startedAt: Date
  lockedAt: Date
  lockedUntil: Date
  heartbeatAt: Date
  lockOwner: string
  lockToken: string
  endedAt: Date
  durationMs: number
  error?: PulseExecutionError
  expiredEventCount?: number
}

export interface DeliveryDocument extends Document {
  _id: string
  /** Last event in the delivery. Retained for cursor indexes and old single-event readers. */
  eventId: string
  /** Ordered events in this execution unit. Missing on deliveries created before batching. */
  eventIds?: string[]
  consumerGroup: string
  topic: string
  eventCreatedAt: Date
  eventSequence?: Timestamp
  status: ConcurrentDeliveryStatus
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  expiresAt?: Date
  finalAttempt?: number
  error?: PulseExecutionError
  /** Total number of attempts claimed so far for a concurrent delivery. */
  attempt?: number
  attemptId?: string
  attemptCreatedAt?: Date
  nextAttemptAt?: Date
  startedAt?: Date
  lockOwner?: string
  lockToken?: string
  lockedAt?: Date
  lockedUntil?: Date
  heartbeatAt?: Date
  /** Number of payloads that expired before the latest attempt could execute. */
  expiredEventCount?: number
  /** Most recent concurrent attempt outcomes, retained in a bounded window. */
  attempts?: DeliveryAttemptDocument[]
}

export interface ResolvedSubscribeOptions {
  configVersion: number
  offsetReset: PulseOffsetReset
  delivery: PulseDeliveryMode
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  maxConcurrency: number
  receiverMode: PulseReceiverMode
  batchSize: number
}

export interface LocalSubscription {
  document: SubscriptionDocument
  options: ResolvedSubscribeOptions
  configuredMaxConcurrency: number
  handlerMode: PulseReceiverMode
  handler: PulseEventHandler<string, unknown> | PulseBatchEventHandler<string, unknown>
  running: number
  unsubscribed: boolean
}
