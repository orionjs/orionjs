export type View = 'overview' | 'deliveries' | 'history' | 'events' | 'subscriptions'
export type Status = 'pending' | 'success' | 'error'
export type HealthStatus = 'healthy' | 'attention' | 'critical'

export interface StatusCounts {
  pending: number
  success: number
  error: number
}

export interface TimelinePoint {
  timestamp: string
  published: number
  success: number
  error: number
}

export interface TopicSummary extends StatusCounts {
  topic: string
  events: number
  lastActivityAt?: string
}

export interface ConsumerGroupSummary extends StatusCounts {
  consumerGroup: string
  lastActivityAt?: string
}

export interface PulseRecord extends Record<string, unknown> {
  id: string
  topic?: string
  consumerGroup?: string
  eventId?: string
  deliveryId?: string
  status?: Status
  attempt?: number
  finalAttempt?: number
  lockState?: 'queued' | 'active' | 'expired'
  createdAt?: string
  updatedAt?: string
  endedAt?: string
  eventCreatedAt?: string
  durationMs?: number
  expiresAt?: string
  error?: {code?: string; name?: string; message?: string; stack?: string}
  event?: PulseRecord
  deliveries?: StatusCounts
  ordered?: boolean
  delivery?: string
  offsetReset?: string
  maxRetries?: number
  cursorCreatedAt?: string
  orderedLease?: 'active' | 'idle'
  discoveryLease?: 'active' | 'idle'
}

export interface OverviewData {
  generatedAt: string
  database: string
  collectionPrefix: string
  range: string
  ping: {latencyMs: number}
  health: {status: HealthStatus; errorRate: number; oldestPendingMs: number}
  totals: {events: number; subscriptions: number; deliveries: number; attempts: number}
  deliveryStatus: StatusCounts
  attemptStatus: StatusCounts
  locks: {active: number; expired: number; queued: number}
  timeline: TimelinePoint[]
  topics: TopicSummary[]
  consumerGroups: ConsumerGroupSummary[]
  recentErrors: PulseRecord[]
}

export interface PagedData {
  items: PulseRecord[]
  pagination: {page: number; limit: number; total: number; pages: number}
}
