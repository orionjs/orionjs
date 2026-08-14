import {AsyncLocalStorage} from 'node:async_hooks'
import {
  type AnyBulkWriteOperation,
  type Db,
  type Document,
  type Filter,
  MongoClient,
  type MongoClientOptions,
} from 'mongodb'
import {uuidv7} from 'uuidv7'
import {PulseConfigurationError, PulseLockLostError} from './errors'
import {HistoryApi} from './HistoryApi'
import {createCollectionsAndIndexes, type PulseCollections} from './indexes'
import type {
  DeliveryDocument,
  EmbeddedAttemptDocument,
  EventDocument,
  HistoryDocument,
  LocalSubscription,
  PulseConnectOptions,
  PulseEventHandler,
  PulseEventMap,
  PulseHistoryApi,
  PulseHistoryError,
  PulsePublishedEvent,
  PulsePublishOptions,
  PulseReceivedEvent,
  PulseSubscribeOptions,
  PulseSubscription,
  PulseSubscriptionInfo,
  PulseTopic,
  ResolvedSubscribeOptions,
  SubscriptionDocument,
} from './types'

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 3000
const DEFAULT_WORKER_COUNT = 4
// Handler slots and coordinator work share one socket by default. Handlers do not retain it.
const DEFAULT_MAX_POOL_SIZE = 1
const DEFAULT_MAX_IDLE_TIME_MS = 30_000
const DEFAULT_LOCK_TIMEOUT_MS = 30_000
const DEFAULT_DISCOVERY_LOCK_TIMEOUT_MS = 10_000
const DISCOVERY_BATCH_SIZE = 100
const DISCOVERY_TOPIC_BATCH_SIZE = 50
const RECONCILIATION_BATCH_SIZE = 25
const RECONCILIATION_INTERVAL_MS = 30_000
const LEGACY_EXECUTION_DRAINED_AUDIT_INTERVAL_MS = 5 * 60_000
const MAX_REAPER_IDLE_INTERVAL_MS = 10_000
const EMBEDDED_ATTEMPT_HISTORY_LIMIT = 10
const ERROR_NAME_LIMIT = 256
const ERROR_MESSAGE_LIMIT = 2_048
const ERROR_STACK_LIMIT = 4_096
const DELIVERY_CLEANUP_BATCH_SIZE = 1_000
const DELIVERY_CLEANUP_INTERVAL_MS = 60_000
const MAX_DATE_MS = 8_640_000_000_000_000

interface ResolvedConnectOptions {
  connectionString: string
  consumerGroup: string
  databaseName?: string
  collectionPrefix: string
  eventRetentionMs: number | null
  historyRetentionMs: number | null
  pollIntervalMs: number
  workerCount: number
  maxPoolSize: number
  maxIdleTimeMS: number
  lockTimeoutMs: number
  discoveryLockTimeoutMs: number
  onError: (error: Error) => void
}

interface OrderedLease {
  subscription: SubscriptionDocument
  lockToken: string
}

interface DiscoveryLease {
  subscription: SubscriptionDocument
  lockToken: string
  lockedUntil: Date
}

interface ExecutionCandidate {
  delivery: DeliveryDocument
  attempt: HistoryDocument
  ordered: boolean
}

interface LegacyClaimedExecution {
  kind: 'legacy'
  local: LocalSubscription
  delivery: DeliveryDocument
  attempt: HistoryDocument
  orderedLease?: OrderedLease
}

interface EmbeddedAttemptContext {
  _id: string
  attempt: number
  createdAt: Date
  nextAttemptAt: Date
  startedAt: Date
  lockedAt: Date
  lockedUntil: Date
  heartbeatAt: Date
  lockOwner: string
  lockToken: string
}

interface EmbeddedClaimedExecution {
  kind: 'embedded'
  local: LocalSubscription
  delivery: DeliveryDocument
  attempt: EmbeddedAttemptContext
}

type ClaimedExecution = LegacyClaimedExecution | EmbeddedClaimedExecution

interface DiscoveryResult {
  discovered: boolean
  scanned: boolean
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000)
}

function isOnlyDuplicateKeyErrors(error: unknown) {
  if (!isDuplicateKeyError(error)) return false
  if (!error || typeof error !== 'object' || !('writeErrors' in error)) return true
  const writeErrors = error.writeErrors
  return (
    !Array.isArray(writeErrors) ||
    writeErrors.every(writeError => writeError && writeError.code === 11000)
  )
}

function assertNonEmptyString(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PulseConfigurationError(`${name} must be a non-empty string.`)
  }
}

function assertPositiveNumber(value: number, name: string, allowZero = false) {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new PulseConfigurationError(
      `${name} must be ${allowZero ? 'zero or a positive' : 'a positive'} number.`,
    )
  }
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new PulseConfigurationError(`${name} must be a positive integer.`)
  }
}

function assertNonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new PulseConfigurationError(`${name} must be zero or a positive integer.`)
  }
}

function assertBoolean(value: boolean, name: string) {
  if (typeof value !== 'boolean') {
    throw new PulseConfigurationError(`${name} must be a boolean.`)
  }
}

function assertFunction(value: unknown, name: string) {
  if (typeof value !== 'function') {
    throw new PulseConfigurationError(`${name} must be a function.`)
  }
}

function assertOneOf<T extends string>(
  value: string,
  values: readonly T[],
  name: string,
): asserts value is T {
  if (!values.includes(value as T)) {
    throw new PulseConfigurationError(`${name} must be one of: ${values.join(', ')}.`)
  }
}

function assertRetrySchedule(options: ResolvedSubscribeOptions) {
  if (options.maxRetries === 0 || options.retryDelayMs === 0) return

  const largestMultiplier =
    options.retryBackoffMultiplier <= 1
      ? 1
      : options.retryBackoffMultiplier ** Math.max(0, options.maxRetries - 1)
  const largestDelay = options.retryDelayMs * largestMultiplier
  if (!Number.isFinite(largestDelay) || largestDelay > MAX_DATE_MS - Date.now()) {
    throw new PulseConfigurationError(
      'retry settings produce a nextAttemptAt outside MongoDB Date range.',
    )
  }
}

function resolveOptions(options: PulseConnectOptions): ResolvedConnectOptions {
  if (!options || typeof options !== 'object') {
    throw new PulseConfigurationError('connect options must be an object.')
  }
  assertNonEmptyString(options.connectionString, 'connectionString')
  assertNonEmptyString(options.consumerGroup, 'consumerGroup')
  if (options.databaseName !== undefined) {
    assertNonEmptyString(options.databaseName, 'databaseName')
  }
  if ('changeStreams' in options) {
    throw new PulseConfigurationError(
      'changeStreams is no longer supported. Pulse always uses polling and reconciliation.',
    )
  }

  const resolved: ResolvedConnectOptions = {
    connectionString: options.connectionString,
    consumerGroup: options.consumerGroup,
    databaseName: options.databaseName,
    collectionPrefix: options.collectionPrefix ?? 'orionjs.pulse',
    eventRetentionMs:
      options.eventRetentionMs === undefined ? WEEK_IN_MS : options.eventRetentionMs,
    historyRetentionMs:
      options.historyRetentionMs === undefined ? WEEK_IN_MS : options.historyRetentionMs,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    workerCount: options.workerCount ?? DEFAULT_WORKER_COUNT,
    maxPoolSize: options.maxPoolSize ?? DEFAULT_MAX_POOL_SIZE,
    maxIdleTimeMS: options.maxIdleTimeMS ?? DEFAULT_MAX_IDLE_TIME_MS,
    lockTimeoutMs: options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    discoveryLockTimeoutMs: options.discoveryLockTimeoutMs ?? DEFAULT_DISCOVERY_LOCK_TIMEOUT_MS,
    onError:
      options.onError ??
      ((error: Error) => {
        console.error('[Pulse]', error)
      }),
  }

  assertNonEmptyString(resolved.collectionPrefix, 'collectionPrefix')
  assertPositiveNumber(resolved.pollIntervalMs, 'pollIntervalMs')
  assertPositiveInteger(resolved.workerCount, 'workerCount')
  assertPositiveInteger(resolved.maxPoolSize, 'maxPoolSize')
  assertPositiveNumber(resolved.maxIdleTimeMS, 'maxIdleTimeMS', true)
  assertPositiveNumber(resolved.lockTimeoutMs, 'lockTimeoutMs')
  assertPositiveNumber(resolved.discoveryLockTimeoutMs, 'discoveryLockTimeoutMs')
  assertFunction(resolved.onError, 'onError')
  if (resolved.eventRetentionMs !== null) {
    assertPositiveNumber(resolved.eventRetentionMs, 'eventRetentionMs', true)
  }
  if (resolved.historyRetentionMs !== null) {
    assertPositiveNumber(resolved.historyRetentionMs, 'historyRetentionMs', true)
  }

  return resolved
}

function resolveSubscribeOptions(
  options: PulseSubscribeOptions,
  workerCount: number,
): ResolvedSubscribeOptions {
  if (!options || typeof options !== 'object') {
    throw new PulseConfigurationError('subscribe options must be an object.')
  }
  const resolved: ResolvedSubscribeOptions = {
    configVersion: options.configVersion ?? 0,
    executionVersion: options.executionVersion ?? 1,
    ordered: options.ordered ?? false,
    offsetReset: options.offsetReset ?? 'latest',
    delivery: options.delivery ?? 'at-least-once',
    maxRetries: options.maxRetries ?? 3,
    retryDelayMs: options.retryDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    maxConcurrency: options.maxConcurrency ?? workerCount,
  }

  assertBoolean(resolved.ordered, 'ordered')
  assertNonNegativeInteger(resolved.configVersion, 'configVersion')
  if (resolved.executionVersion !== 1 && resolved.executionVersion !== 2) {
    throw new PulseConfigurationError('executionVersion must be either 1 or 2.')
  }
  assertOneOf(resolved.offsetReset, ['latest', 'earliest'], 'offsetReset')
  assertOneOf(resolved.delivery, ['at-least-once', 'at-most-once'], 'delivery')
  assertNonNegativeInteger(resolved.maxRetries, 'maxRetries')
  assertPositiveNumber(resolved.retryDelayMs, 'retryDelayMs', true)
  assertPositiveNumber(resolved.retryBackoffMultiplier, 'retryBackoffMultiplier')
  assertPositiveInteger(resolved.maxConcurrency, 'maxConcurrency')
  if (resolved.delivery === 'at-most-once' && options.maxRetries && options.maxRetries > 0) {
    throw new PulseConfigurationError(
      'maxRetries must be zero or omitted when delivery is "at-most-once".',
    )
  }
  if (resolved.delivery === 'at-most-once') resolved.maxRetries = 0
  if (resolved.ordered) resolved.maxConcurrency = 1
  if (resolved.executionVersion === 2 && resolved.ordered) {
    throw new PulseConfigurationError(
      'executionVersion 2 currently supports unordered subscriptions only.',
    )
  }
  assertRetrySchedule(resolved)

  return resolved
}

function getDatabaseName(connectionString: string) {
  const schemeIndex = connectionString.indexOf('://')
  if (schemeIndex === -1) return undefined
  const authorityAndPath = connectionString.slice(schemeIndex + 3).split('?')[0]
  const slashIndex = authorityAndPath.indexOf('/')
  if (slashIndex === -1) return undefined
  const databaseName = authorityAndPath.slice(slashIndex + 1)
  return databaseName ? decodeURIComponent(databaseName) : undefined
}

function getExpiresAt(date: Date, retentionMs: number | null) {
  return retentionMs === null ? undefined : new Date(date.getTime() + retentionMs)
}

function safeString(value: unknown, fallback: string) {
  try {
    return String(value)
  } catch {
    return fallback
  }
}

function truncateString(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

function serializeError(error: unknown, code = 'handler_error'): PulseHistoryError {
  if (!(error instanceof Error)) {
    return {
      code,
      name: 'Error',
      message: safeString(error, 'Handler threw an unreadable value.'),
    }
  }

  let name = 'Error'
  let message = 'Handler threw an unreadable error.'
  let stack: string | undefined
  try {
    name = safeString(error.name, 'Error')
  } catch {
    // Error subclasses can expose hostile property accessors.
  }
  try {
    message = safeString(error.message, 'Handler threw an unreadable error.')
  } catch {
    // Error subclasses can expose hostile property accessors.
  }
  try {
    stack = typeof error.stack === 'string' ? error.stack : undefined
  } catch {
    // A stack is diagnostic only and must never strand a delivery.
  }

  return {
    code,
    name,
    message,
    ...(stack ? {stack} : {}),
  }
}

function serializeEmbeddedError(error: unknown, code = 'handler_error'): PulseHistoryError {
  const serialized = serializeError(error, code)
  return {
    code: serialized.code,
    name: truncateString(serialized.name, ERROR_NAME_LIMIT),
    message: truncateString(serialized.message, ERROR_MESSAGE_LIMIT),
    ...(serialized.stack ? {stack: truncateString(serialized.stack, ERROR_STACK_LIMIT)} : {}),
  }
}

function subscriptionConfig(document: SubscriptionDocument) {
  return {
    configVersion: document.configVersion ?? 0,
    executionVersion: document.executionVersion ?? 1,
    ordered: document.ordered,
    offsetReset: document.offsetReset,
    delivery: document.delivery,
    maxRetries: document.maxRetries,
    retryDelayMs: document.retryDelayMs,
    retryBackoffMultiplier: document.retryBackoffMultiplier,
  }
}

function configsMatch(document: SubscriptionDocument, options: ResolvedSubscribeOptions) {
  const expected = {
    configVersion: options.configVersion,
    executionVersion: options.executionVersion,
    ordered: options.ordered,
    offsetReset: options.offsetReset,
    delivery: options.delivery,
    maxRetries: options.maxRetries,
    retryDelayMs: options.retryDelayMs,
    retryBackoffMultiplier: options.retryBackoffMultiplier,
  }
  return JSON.stringify(subscriptionConfig(document)) === JSON.stringify(expected)
}

function persistedConfig(options: ResolvedSubscribeOptions) {
  return {
    configVersion: options.configVersion,
    executionVersion: options.executionVersion,
    ordered: options.ordered,
    offsetReset: options.offsetReset,
    delivery: options.delivery,
    maxRetries: options.maxRetries,
    retryDelayMs: options.retryDelayMs,
    retryBackoffMultiplier: options.retryBackoffMultiplier,
  }
}

function optionsFromDocument(
  document: SubscriptionDocument,
  configuredMaxConcurrency: number,
): ResolvedSubscribeOptions {
  return {
    ...subscriptionConfig(document),
    maxConcurrency: document.ordered ? 1 : configuredMaxConcurrency,
  }
}

function configVersionFilter(configVersion: number) {
  if (configVersion !== 0) return {configVersion}
  return {$or: [{configVersion: 0}, {configVersion: {$exists: false}}]}
}

function circularBatch<T>(items: T[], offset: number, limit: number) {
  if (items.length === 0 || limit <= 0) return []
  const start = offset % items.length
  const count = Math.min(items.length, limit)
  return Array.from({length: count}, (_, index) => items[(start + index) % items.length])
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[other]] = [items[other], items[index]]
  }
  return items
}

export class Pulse<TEvents extends PulseEventMap = Record<string, unknown>> {
  readonly history: PulseHistoryApi

  private readonly options: ResolvedConnectOptions
  private readonly client: MongoClient
  private readonly readyPromise: Promise<void>
  private readonly localSubscriptions = new Map<string, LocalSubscription>()
  private readonly subscribingTopics = new Set<string>()
  private readonly wakeWaiters = new Set<() => void>()
  private readonly handlerContext = new AsyncLocalStorage<boolean>()
  private readonly coordinatorId = uuidv7()
  private readonly activeExecutions = new Set<Promise<void>>()
  private readonly discoveryLeases = new Map<string, DiscoveryLease>()
  private discoveryRefreshAt = 0
  private localSubscriptionRevision = 0
  private discoveryTopicOffset = 0
  private workTopicOffset = Math.floor(Math.random() * 1_000_000_000)
  private deliveryCleanupTopicOffset = 0
  private embeddedClaimFirst = true
  private embeddedWorkEnabled = false
  private legacyExecutionState: 'unknown' | 'required' | 'drained' = 'unknown'
  private nextLegacyExecutionAuditAt = 0
  private nextLegacyClaimAt = 0
  private nextEmbeddedClaimAt = 0
  private db?: Db
  private collections?: PulseCollections
  private coordinatorPromise?: Promise<void>
  private discoveryRequestRevision = 0
  private handledDiscoveryRequestRevision = 0
  private nextDiscoveryAt = 0
  private nextReapAt = 0
  private nextReconciliationAt = 0
  private nextDeliveryCleanupAt = Date.now() + DELIVERY_CLEANUP_INTERVAL_MS
  private running = true
  private closePromise?: Promise<void>

  constructor(options: PulseConnectOptions) {
    this.options = resolveOptions(options)
    this.client = new MongoClient(this.options.connectionString, {
      // Distinct metadata lets operators verify bridge-capable clients before activating v2.
      appName: '@orion-js/pulse-bridge-v2',
      maxPoolSize: this.options.maxPoolSize,
      minPoolSize: 0,
      maxIdleTimeMS: this.options.maxIdleTimeMS,
    } satisfies MongoClientOptions)
    this.history = new HistoryApi(
      () => this.awaitConnection(),
      () => this.getCollections(),
    )
    this.readyPromise = this.initialize()
    void this.readyPromise.catch(error => this.reportError(error))
  }

  async awaitConnection() {
    await this.readyPromise
  }

  async publish<TTopic extends PulseTopic<TEvents>>(
    options: PulsePublishOptions<TTopic, TEvents[TTopic]>,
  ): Promise<PulsePublishedEvent<TTopic, TEvents[TTopic]>> {
    await this.awaitConnection()
    assertNonEmptyString(options.topic, 'topic')

    const createdAt = new Date()
    const expiresAt = getExpiresAt(createdAt, this.options.eventRetentionMs)
    const candidate: EventDocument<TEvents[TTopic]> = {
      _id: uuidv7(),
      topic: options.topic,
      data: options.data,
      publisher: this.options.consumerGroup,
      createdAt,
      ...(options.headers ? {headers: options.headers} : {}),
      ...(expiresAt ? {expiresAt} : {}),
    }

    const document = await this.getCollections().events.findOneAndUpdate(
      {_id: candidate._id, sequence: {$exists: false}},
      {
        $setOnInsert: candidate as EventDocument,
        // BSON timestamps include MongoDB's per-second increment and therefore reflect
        // primary write order even when publishers or their clocks race.
        $currentDate: {sequence: {$type: 'timestamp'}},
      },
      {upsert: true, returnDocument: 'after'},
    )
    if (!document) {
      throw new Error(`MongoDB did not return published event ${candidate._id}.`)
    }
    this.requestDiscovery()

    return {
      id: document._id,
      topic: options.topic,
      data: options.data,
      publisher: document.publisher,
      headers: document.headers,
      createdAt: document.createdAt,
      expiresAt: document.expiresAt,
    }
  }

  async subscribe<TTopic extends PulseTopic<TEvents>>(
    topic: TTopic,
    handler: PulseEventHandler<TTopic, TEvents[TTopic]>,
    userOptions: PulseSubscribeOptions = {},
  ): Promise<PulseSubscription> {
    await this.awaitConnection()
    assertNonEmptyString(topic, 'topic')
    if (typeof handler !== 'function') {
      throw new PulseConfigurationError('subscribe handler must be a function.')
    }
    if (this.localSubscriptions.has(topic)) {
      throw new PulseConfigurationError(`Pulse is already subscribed to topic "${topic}".`)
    }
    if (this.subscribingTopics.has(topic)) {
      throw new PulseConfigurationError(
        `Pulse is already creating a subscription for topic "${topic}".`,
      )
    }

    const configuredMaxConcurrency = userOptions.maxConcurrency ?? this.options.workerCount
    const requestedOptions = resolveSubscribeOptions(userOptions, this.options.workerCount)
    this.subscribingTopics.add(topic)
    try {
      const document = await this.getOrCreateSubscription(topic, requestedOptions, userOptions)
      const local: LocalSubscription = {
        document,
        options: optionsFromDocument(document, configuredMaxConcurrency),
        configuredMaxConcurrency,
        handler: handler as PulseEventHandler<string, unknown>,
        running: 0,
        unsubscribed: false,
      }
      this.localSubscriptions.set(topic, local)
      this.localSubscriptionRevision++
      this.invalidateLegacyExecutionState()
      this.discoveryRefreshAt = 0
      this.requestDiscovery()

      let unsubscribed = false
      const subscription: PulseSubscription = {
        ...this.toSubscriptionInfo(local),
        unsubscribe: async () => {
          if (unsubscribed) return
          unsubscribed = true
          local.unsubscribed = true
          if (this.localSubscriptions.get(topic) === local) {
            this.localSubscriptions.delete(topic)
            this.localSubscriptionRevision++
            this.invalidateLegacyExecutionState()
          }
          await this.releaseDiscoveryLeaseForTopic(topic)
          this.discoveryRefreshAt = 0
          this.wakeCoordinator()
        },
      }

      return subscription
    } finally {
      this.subscribingTopics.delete(topic)
    }
  }

  getSubscriptions(): PulseSubscriptionInfo[] {
    return [...this.localSubscriptions.values()].map(subscription =>
      this.toSubscriptionInfo(subscription),
    )
  }

  async close() {
    if (!this.closePromise) this.closePromise = this.closeInternal()
    // Waiting for active execution from inside its own handler would deadlock.
    // Start the graceful close, then let the callback return and acknowledge.
    if (this.handlerContext.getStore()) return
    return this.closePromise
  }

  private async initialize() {
    try {
      await this.client.connect()
      const databaseName =
        this.options.databaseName ?? getDatabaseName(this.options.connectionString)
      if (!databaseName) {
        throw new PulseConfigurationError(
          'databaseName is required when the MongoDB connection string does not include a database.',
        )
      }

      this.db = this.client.db(databaseName)
      this.collections = await createCollectionsAndIndexes(this.db, this.options.collectionPrefix)
      this.coordinatorPromise = this.runCoordinator()
    } catch (error) {
      this.running = false
      await this.client.close().catch(() => undefined)
      throw error
    }
  }

  private async runCoordinator() {
    while (this.running) {
      try {
        const didWork = await this.coordinateOnce()
        if (!didWork) await this.waitForCoordinator()
      } catch (error) {
        this.reportError(error)
        await this.waitForCoordinator()
      }
    }
  }

  private async coordinateOnce() {
    if (this.localSubscriptions.size === 0) return false

    const requestedRevision = this.discoveryRequestRevision
    const shouldScanEvents =
      requestedRevision !== this.handledDiscoveryRequestRevision ||
      Date.now() >= this.nextDiscoveryAt
    const discovery = await this.discoverEvents(shouldScanEvents)
    if (shouldScanEvents || discovery.scanned) {
      this.handledDiscoveryRequestRevision = requestedRevision
      this.nextDiscoveryAt = discovery.discovered ? 0 : Date.now() + this.options.pollIntervalMs
    }

    const needsLegacyExecution = await this.needsLegacyExecution()

    const leaderTopics = [...this.discoveryLeases.keys()].filter(topic =>
      this.localSubscriptions.has(topic),
    )
    let reaped = 0
    let reconciled = 0
    let cleaned = 0
    if (leaderTopics.length > 0) {
      const now = Date.now()
      if (now >= this.nextReapAt) {
        reaped = await this.reapExpiredAttempts(leaderTopics, needsLegacyExecution)
      }
      if (needsLegacyExecution && now >= this.nextReconciliationAt) {
        reconciled = await this.reconcileDeliveries(leaderTopics)
      }
      if (now >= this.nextDeliveryCleanupAt) {
        cleaned = await this.cleanupSuccessfulDeliveries(leaderTopics)
      }
    }

    let dispatched = false
    const capacity = this.options.workerCount - this.activeExecutions.size
    const executions =
      capacity > 0 ? await this.claimExecutions(capacity, needsLegacyExecution) : []
    for (const execution of executions) {
      if (!this.running) break
      this.startExecution(execution)
      dispatched = true
    }
    return discovery.discovered || reaped > 0 || reconciled > 0 || cleaned > 0 || dispatched
  }

  private invalidateLegacyExecutionState() {
    this.legacyExecutionState = 'unknown'
    this.nextLegacyExecutionAuditAt = 0
    this.nextLegacyClaimAt = 0
    this.nextReconciliationAt = 0
    this.nextReapAt = 0
  }

  private async needsLegacyExecution() {
    const locals = [...this.localSubscriptions.values()].filter(local => !local.unsubscribed)
    if (locals.some(local => local.options.executionVersion === 1)) {
      this.legacyExecutionState = 'required'
      this.nextLegacyExecutionAuditAt = Number.POSITIVE_INFINITY
      return true
    }
    if (locals.length === 0) return false

    const now = Date.now()
    if (this.legacyExecutionState === 'drained' && now < this.nextLegacyExecutionAuditAt) {
      return false
    }
    if (this.legacyExecutionState === 'required' && now < this.nextLegacyExecutionAuditAt) {
      return true
    }

    const subscriptionRevision = this.localSubscriptionRevision
    const topics = locals.map(local => local.document.topic)
    const collections = this.getCollections()
    const projection = {_id: 1}
    const pendingHistory = await collections.history.findOne(
      {
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        status: 'pending',
      },
      {projection, hint: 'pulse_history_pending_acquisition'},
    )
    if (pendingHistory) {
      this.legacyExecutionState = 'required'
      this.nextLegacyExecutionAuditAt = now + RECONCILIATION_INTERVAL_MS
      return true
    }

    const historyMarker = await collections.history.findOne(
      {
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        needsReconciliation: true,
      },
      {projection, hint: 'pulse_history_reconciliation'},
    )
    if (historyMarker) {
      this.legacyExecutionState = 'required'
      this.nextLegacyExecutionAuditAt = now + RECONCILIATION_INTERVAL_MS
      return true
    }

    const deliveryMarker = await collections.deliveries.findOne(
      {
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        needsReconciliation: true,
      },
      {projection, hint: 'pulse_deliveries_reconciliation'},
    )
    if (deliveryMarker) {
      this.legacyExecutionState = 'required'
      this.nextLegacyExecutionAuditAt = now + RECONCILIATION_INTERVAL_MS
      return true
    }

    // A subscription may be added while the indexed reads are in flight. Keep the
    // bridge enabled for this pass and audit the new snapshot on the next pass.
    if (subscriptionRevision !== this.localSubscriptionRevision) {
      this.legacyExecutionState = 'unknown'
      this.nextLegacyExecutionAuditAt = 0
      return true
    }

    this.legacyExecutionState = 'drained'
    // A slow re-audit covers a pre-patch replica that materializes v1 work after
    // this process observed a clean bridge during a rolling deployment.
    this.nextLegacyExecutionAuditAt = now + LEGACY_EXECUTION_DRAINED_AUDIT_INTERVAL_MS
    return false
  }

  private async discoverEvents(scanEvents: boolean): Promise<DiscoveryResult> {
    await this.refreshDiscoveryLeases()
    if (!scanEvents) return {discovered: false, scanned: false}

    const locals = this.discoverySubscriptionsInFairBatch()
    if (locals.length === 0) return {discovered: false, scanned: false}

    const events = this.getCollections().events
    const perTopicLimit = Math.max(1, Math.floor(DISCOVERY_BATCH_SIZE / locals.length))
    const branches: Document[][] = []
    for (const local of locals) {
      const subscription = local.document
      const sequencedMatch = subscription.cursorSequence
        ? {
            $or: [
              {topic: subscription.topic, sequence: {$gt: subscription.cursorSequence}},
              {
                topic: subscription.topic,
                sequence: subscription.cursorSequence,
                _id: {$gt: subscription.cursorSequenceEventId ?? ''},
              },
            ],
          }
        : {topic: subscription.topic, sequence: {$exists: true}}
      const sequencedBranch: Document[] = [
        {$match: sequencedMatch},
        {$sort: {sequence: 1, _id: 1}},
        {$limit: perTopicLimit},
        {$set: {__pulseLegacy: false}},
      ]
      const legacyMatch = subscription.cursorCreatedAt
        ? {
            $or: [
              {
                topic: subscription.topic,
                sequence: {$exists: false},
                createdAt: {$gt: subscription.cursorCreatedAt},
              },
              {
                topic: subscription.topic,
                sequence: {$exists: false},
                createdAt: subscription.cursorCreatedAt,
                _id: {$gt: subscription.cursorEventId ?? ''},
              },
            ],
          }
        : {topic: subscription.topic, sequence: {$exists: false}}
      const legacyBranch: Document[] = [
        {$match: legacyMatch},
        {$sort: {createdAt: 1, _id: 1}},
        {$limit: perTopicLimit},
        {$set: {__pulseLegacy: true}},
      ]
      branches.push(sequencedBranch, legacyBranch)
    }

    const [firstBranch, ...remainingBranches] = branches
    const pipeline: Document[] = [...firstBranch]
    for (const branch of remainingBranches) {
      pipeline.push({$unionWith: {coll: events.collectionName, pipeline: branch}})
    }

    const discoveredEvents = (await events.aggregate(pipeline).toArray()) as Array<
      EventDocument & {__pulseLegacy: boolean}
    >
    const latestLegacy = new Map<string, EventDocument>()
    const latestSequenced = new Map<string, EventDocument>()
    const batchLeaseTokens = new Map(
      locals.map(local => [
        local.document.topic,
        this.discoveryLeases.get(local.document.topic)?.lockToken,
      ]),
    )
    const invalidTopics = new Set<string>()

    for (let batchStart = 0; batchStart < discoveredEvents.length; batchStart += 25) {
      if (batchStart > 0) await this.refreshDiscoveryLeases()
      const validEvents: Array<EventDocument & {__pulseLegacy: boolean}> = []
      for (const event of discoveredEvents.slice(batchStart, batchStart + 25)) {
        const local = this.localSubscriptions.get(event.topic)
        const expectedToken = batchLeaseTokens.get(event.topic)
        const currentToken = this.discoveryLeases.get(event.topic)?.lockToken
        if (
          !local ||
          local.unsubscribed ||
          !expectedToken ||
          currentToken !== expectedToken ||
          invalidTopics.has(event.topic)
        ) {
          invalidTopics.add(event.topic)
          latestLegacy.delete(event.topic)
          latestSequenced.delete(event.topic)
          continue
        }
        validEvents.push(event)
      }
      await this.materializeDeliveries(validEvents)
      for (const event of validEvents) {
        if (event.__pulseLegacy) latestLegacy.set(event.topic, event)
        else latestSequenced.set(event.topic, event)
      }
    }

    for (const [topic, event] of latestLegacy) {
      const local = this.localSubscriptions.get(topic)
      const expectedToken = batchLeaseTokens.get(topic)
      if (!local || local.unsubscribed || !expectedToken || invalidTopics.has(topic)) continue
      this.updateLocalSubscription(
        local,
        await this.advanceDiscoveryCursor(
          local.document,
          {
            cursorCreatedAt: event.createdAt,
            cursorEventId: event._id,
          },
          expectedToken,
        ),
      )
    }
    for (const [topic, event] of latestSequenced) {
      if (!event.sequence) continue
      const local = this.localSubscriptions.get(topic)
      const expectedToken = batchLeaseTokens.get(topic)
      if (!local || local.unsubscribed || !expectedToken || invalidTopics.has(topic)) continue
      this.updateLocalSubscription(
        local,
        await this.advanceDiscoveryCursor(
          local.document,
          {
            cursorSequence: event.sequence,
            cursorSequenceEventId: event._id,
          },
          expectedToken,
        ),
      )
    }

    return {discovered: discoveredEvents.length > 0, scanned: true}
  }

  private async materializeDeliveries(events: EventDocument[]) {
    if (events.length === 0) return
    const collections = this.getCollections()
    const candidates = events.map(event => {
      const createdAt = new Date()
      const executionVersion =
        this.localSubscriptions.get(event.topic)?.options.executionVersion ?? 1
      if (executionVersion === 2) {
        this.embeddedWorkEnabled = true
        return {
          _id: uuidv7(),
          eventId: event._id,
          consumerGroup: this.options.consumerGroup,
          topic: event.topic,
          eventCreatedAt: event.createdAt,
          ...(event.sequence ? {eventSequence: event.sequence} : {}),
          executionVersion: 2 as const,
          status: 'v2-pending' as const,
          attempt: 0,
          attemptId: uuidv7(),
          attemptCreatedAt: createdAt,
          nextAttemptAt: createdAt,
          attempts: [],
          createdAt,
          updatedAt: createdAt,
        } satisfies DeliveryDocument
      }
      return {
        _id: uuidv7(),
        eventId: event._id,
        consumerGroup: this.options.consumerGroup,
        topic: event.topic,
        eventCreatedAt: event.createdAt,
        ...(event.sequence ? {eventSequence: event.sequence} : {}),
        status: 'pending' as const,
        createdAt,
        updatedAt: createdAt,
        needsReconciliation: true,
      } satisfies DeliveryDocument
    })
    if (candidates.some(candidate => candidate.status === 'pending')) this.nextLegacyClaimAt = 0
    if (candidates.some(candidate => candidate.status === 'v2-pending')) {
      this.nextEmbeddedClaimAt = 0
    }
    try {
      await collections.deliveries.bulkWrite(
        candidates.map<AnyBulkWriteOperation<DeliveryDocument>>(candidate => ({
          updateOne: {
            filter: {
              consumerGroup: candidate.consumerGroup,
              eventId: candidate.eventId,
            },
            update: {$setOnInsert: candidate},
            upsert: true,
          },
        })),
        {ordered: false},
      )
    } catch (error) {
      if (!isOnlyDuplicateKeyErrors(error)) throw error
    }

    const legacyCandidates = candidates.filter(candidate => candidate.status === 'pending')
    if (legacyCandidates.length === 0) return
    const deliveries = await collections.deliveries
      .find({
        consumerGroup: this.options.consumerGroup,
        eventId: {$in: legacyCandidates.map(candidate => candidate.eventId)},
        status: 'pending',
      })
      .toArray()
    if (deliveries.length === 0) return
    const deliveryIdsWithHistory = new Set(
      await collections.history.distinct('deliveryId', {
        deliveryId: {$in: deliveries.map(delivery => delivery._id)},
      }),
    )
    const uninitializedDeliveries = deliveries.filter(
      delivery => !deliveryIdsWithHistory.has(delivery._id),
    )
    if (uninitializedDeliveries.length === 0) return
    const historyOperations = uninitializedDeliveries.map<AnyBulkWriteOperation<HistoryDocument>>(
      delivery => {
        const attempt: HistoryDocument = {
          _id: uuidv7(),
          deliveryId: delivery._id,
          eventId: delivery.eventId,
          consumerGroup: delivery.consumerGroup,
          topic: delivery.topic,
          attempt: 1,
          status: 'pending',
          createdAt: new Date(),
          nextAttemptAt: delivery.createdAt,
        }
        return {
          updateOne: {
            filter: {deliveryId: delivery._id, attempt: 1},
            update: {$setOnInsert: attempt},
            upsert: true,
          },
        }
      },
    )
    let initializedDeliveryIds: string[] = []
    try {
      const result = await collections.history.bulkWrite(historyOperations, {ordered: false})
      initializedDeliveryIds = Object.keys(result.upsertedIds).map(
        index => uninitializedDeliveries[Number(index)]._id,
      )
    } catch (error) {
      if (!isOnlyDuplicateKeyErrors(error)) throw error
    }
    if (initializedDeliveryIds.length === 0) return
    await collections.deliveries.updateMany(
      {
        _id: {$in: initializedDeliveryIds},
        status: 'pending',
        needsReconciliation: true,
      },
      {$unset: {needsReconciliation: ''}},
    )
  }

  private async claimExecutions(
    capacity: number,
    needsLegacyExecution = true,
  ): Promise<ClaimedExecution[]> {
    if (capacity <= 0) return []

    if (!needsLegacyExecution) {
      if (Date.now() < this.nextEmbeddedClaimAt) return []
      const executions = await this.claimEmbeddedExecutions(capacity)
      this.nextEmbeddedClaimAt =
        executions.length === 0 ? Date.now() + this.options.pollIntervalMs : 0
      return executions
    }

    const claimEmbeddedFirst = this.embeddedClaimFirst
    this.embeddedClaimFirst = !this.embeddedClaimFirst
    const claimed: ClaimedExecution[] = []
    const claimNext = async (kind: 'legacy' | 'embedded') => {
      const remaining = capacity - claimed.length
      if (remaining <= 0) return
      const nextClaimAt = kind === 'embedded' ? this.nextEmbeddedClaimAt : this.nextLegacyClaimAt
      if (Date.now() < nextClaimAt) return
      const executions =
        kind === 'embedded'
          ? await this.claimEmbeddedExecutions(remaining)
          : await this.claimLegacyExecutions(remaining)
      if (kind === 'embedded') {
        this.nextEmbeddedClaimAt =
          executions.length === 0 ? Date.now() + this.options.pollIntervalMs : 0
      } else {
        this.nextLegacyClaimAt =
          executions.length === 0 ? Date.now() + this.options.pollIntervalMs : 0
      }
      claimed.push(...executions)
    }

    await claimNext(claimEmbeddedFirst ? 'embedded' : 'legacy')
    await claimNext(claimEmbeddedFirst ? 'legacy' : 'embedded')
    return claimed
  }

  private async claimLegacyExecutions(capacity: number): Promise<LegacyClaimedExecution[]> {
    if (capacity <= 0) return []
    const candidates = await this.findExecutionCandidates(capacity)
    const executions: LegacyClaimedExecution[] = []
    const unsettled = new Set<LegacyClaimedExecution>()

    try {
      for (const candidate of candidates) {
        if (!this.running || executions.length >= capacity) break
        const local = this.localSubscriptions.get(candidate.delivery.topic)
        if (!local || local.unsubscribed) continue
        if (candidate.ordered !== local.options.ordered) continue
        if (
          local.options.ordered ? local.running > 0 : local.running >= local.options.maxConcurrency
        ) {
          continue
        }

        const workerId = uuidv7()
        let orderedLease: OrderedLease | undefined
        if (local.options.ordered) {
          orderedLease = await this.acquireOrderedLease(local, workerId)
          if (!orderedLease) continue
          if (this.localSubscriptions.get(local.document.topic) !== local || local.unsubscribed) {
            await this.releaseOrderedLease(orderedLease)
            continue
          }
        }

        let attempt: HistoryDocument | undefined
        try {
          attempt = await this.claimAttempt(candidate.attempt, workerId)
        } catch (error) {
          if (orderedLease) {
            await this.releaseOrderedLease(orderedLease).catch(releaseError =>
              this.reportError(releaseError),
            )
          }
          throw error
        }
        if (!attempt) {
          if (orderedLease) await this.releaseOrderedLease(orderedLease)
          continue
        }

        local.running++
        const execution: LegacyClaimedExecution = {
          kind: 'legacy',
          local,
          delivery: candidate.delivery,
          attempt,
          orderedLease,
        }
        executions.push(execution)
        unsettled.add(execution)
      }

      if (executions.length === 0) return []
      const currentDeliveries = await this.getCollections()
        .deliveries.find({_id: {$in: executions.map(execution => execution.delivery._id)}})
        .toArray()
      const currentById = new Map(currentDeliveries.map(delivery => [delivery._id, delivery]))
      const validated: LegacyClaimedExecution[] = []
      for (const execution of executions) {
        const registered = this.localSubscriptions.get(execution.delivery.topic)
        if (registered !== execution.local || execution.local.unsubscribed) {
          await this.abandonClaimedExecution(execution)
          unsettled.delete(execution)
          continue
        }

        const current = currentById.get(execution.delivery._id)
        if (current?.status === 'pending') {
          execution.delivery = current
          validated.push(execution)
          continue
        }

        const history = await this.finishAttemptWithError(
          execution.attempt,
          serializeEmbeddedError(
            new Error(
              current
                ? 'The delivery became terminal before this attempt could start.'
                : 'The delivery disappeared before this attempt could start.',
            ),
            current ? 'delivery_already_terminal' : 'delivery_missing',
          ),
        )
        if (history && current) await this.applyTerminalRetention(current)
        if (execution.orderedLease) await this.releaseOrderedLease(execution.orderedLease)
        execution.local.running--
        unsettled.delete(execution)
      }
      return validated
    } catch (error) {
      await Promise.all([...unsettled].map(execution => this.abandonClaimedExecution(execution)))
      throw error
    }
  }

  private async claimEmbeddedExecutions(capacity: number): Promise<EmbeddedClaimedExecution[]> {
    if (capacity <= 0) return []
    if (!this.embeddedWorkEnabled) {
      this.embeddedWorkEnabled = [...this.localSubscriptions.values()].some(
        local => local.options.executionVersion === 2 || local.document.embeddedExecutionSeen,
      )
      if (!this.embeddedWorkEnabled) return []
    }
    const deliveries = this.getCollections().deliveries
    const executions: EmbeddedClaimedExecution[] = []

    try {
      while (this.running && executions.length < capacity) {
        const eligibleTopics = [...this.localSubscriptions.values()]
          .filter(local => !local.unsubscribed && local.running < local.options.maxConcurrency)
          .map(local => local.document.topic)
        if (eligibleTopics.length === 0) break

        const now = new Date()
        const lockToken = uuidv7()
        const lockOwner = uuidv7()
        const claimed = await deliveries.findOneAndUpdate(
          {
            consumerGroup: this.options.consumerGroup,
            topic: {$in: eligibleTopics},
            executionVersion: 2,
            status: 'v2-pending',
            nextAttemptAt: {$lte: now},
          },
          {
            $inc: {attempt: 1},
            $set: {
              status: 'v2-processing',
              startedAt: now,
              lockOwner,
              lockToken,
              lockedAt: now,
              lockedUntil: new Date(now.getTime() + this.options.lockTimeoutMs),
              heartbeatAt: now,
              updatedAt: now,
            },
          },
          {
            sort: {nextAttemptAt: 1, createdAt: 1},
            returnDocument: 'after',
          },
        )
        if (!claimed) break

        const local = this.localSubscriptions.get(claimed.topic)
        if (
          !local ||
          local.unsubscribed ||
          typeof claimed.attempt !== 'number' ||
          !claimed.attemptId ||
          !claimed.attemptCreatedAt ||
          !claimed.nextAttemptAt ||
          !claimed.startedAt ||
          !claimed.lockedAt ||
          !claimed.lockedUntil ||
          !claimed.heartbeatAt ||
          !claimed.lockOwner ||
          !claimed.lockToken
        ) {
          await this.releaseUnstartedEmbeddedAttempt(claimed)
          continue
        }

        local.running++
        executions.push({
          kind: 'embedded',
          local,
          delivery: claimed,
          attempt: {
            _id: claimed.attemptId,
            attempt: claimed.attempt,
            createdAt: claimed.attemptCreatedAt,
            nextAttemptAt: claimed.nextAttemptAt,
            startedAt: claimed.startedAt,
            lockedAt: claimed.lockedAt,
            lockedUntil: claimed.lockedUntil,
            heartbeatAt: claimed.heartbeatAt,
            lockOwner: claimed.lockOwner,
            lockToken: claimed.lockToken,
          },
        })
      }
      return executions
    } catch (error) {
      await Promise.all(executions.map(execution => this.abandonClaimedExecution(execution)))
      throw error
    }
  }

  private async abandonClaimedExecution(execution: ClaimedExecution) {
    if (execution.kind === 'embedded') {
      await this.releaseUnstartedEmbeddedAttempt(execution.delivery)
      execution.local.running--
      return
    }
    const results = await Promise.allSettled([
      this.releaseUnstartedAttempt(execution.attempt),
      ...(execution.orderedLease ? [this.releaseOrderedLease(execution.orderedLease)] : []),
    ])
    execution.local.running--
    for (const result of results) {
      if (result.status === 'rejected') this.reportError(result.reason)
    }
  }

  private async releaseUnstartedEmbeddedAttempt(delivery: DeliveryDocument) {
    if (!delivery.lockToken) return
    await this.getCollections().deliveries.updateOne(
      {
        _id: delivery._id,
        executionVersion: 2,
        status: 'v2-processing',
        lockToken: delivery.lockToken,
      },
      {
        $set: {status: 'v2-pending', updatedAt: new Date()},
        $inc: {attempt: -1},
        $unset: {
          startedAt: '',
          lockOwner: '',
          lockToken: '',
          lockedAt: '',
          lockedUntil: '',
          heartbeatAt: '',
        },
      },
    )
  }

  private async findExecutionCandidates(capacity: number): Promise<ExecutionCandidate[]> {
    const collections = this.getCollections()
    const now = new Date()
    const candidateLimit = Math.max(16, Math.min(100, capacity * 8))
    const eligible = [...this.localSubscriptions.values()].filter(
      local =>
        !local.unsubscribed &&
        (local.options.ordered
          ? local.running === 0 && this.discoveryLeases.has(local.document.topic)
          : local.running < local.options.maxConcurrency),
    )
    if (eligible.length === 0) return []

    const selected = circularBatch(
      eligible,
      this.workTopicOffset,
      Math.min(DISCOVERY_TOPIC_BATCH_SIZE, candidateLimit),
    )
    this.workTopicOffset = (this.workTopicOffset + selected.length) % eligible.length
    const concurrentPerTopicLimit = Math.max(1, Math.ceil(candidateLimit / selected.length))
    const branches: Array<{collectionName: string; pipeline: Document[]}> = []

    for (const local of selected) {
      const topic = local.document.topic
      if (local.options.ordered) {
        branches.push({
          collectionName: collections.deliveries.collectionName,
          pipeline: [
            {
              $match: {
                consumerGroup: this.options.consumerGroup,
                topic,
                status: 'pending',
                eventSequence: {$exists: false},
              },
            },
            {$sort: {eventCreatedAt: 1, eventId: 1}},
            {$limit: 1},
            {$set: {__pulseOrderKind: 0}},
            {
              $unionWith: {
                coll: collections.deliveries.collectionName,
                pipeline: [
                  {
                    $match: {
                      consumerGroup: this.options.consumerGroup,
                      topic,
                      status: 'pending',
                      eventSequence: {$exists: true},
                    },
                  },
                  {$sort: {eventSequence: 1, eventId: 1}},
                  {$limit: 1},
                  {$set: {__pulseOrderKind: 1}},
                ],
              },
            },
            {
              $sort: {
                __pulseOrderKind: 1,
                eventSequence: 1,
                eventCreatedAt: 1,
                eventId: 1,
              },
            },
            {$limit: 1},
            {$set: {__pulseDelivery: '$$ROOT'}},
            {
              $lookup: {
                from: collections.history.collectionName,
                let: {deliveryId: '$_id'},
                pipeline: [
                  {
                    $match: {
                      $expr: {$eq: ['$deliveryId', '$$deliveryId']},
                      status: 'pending',
                      nextAttemptAt: {$lte: now},
                      lockToken: {$exists: false},
                    },
                  },
                  {$sort: {attempt: -1}},
                  {$limit: 1},
                ],
                as: '__pulseAttempts',
              },
            },
            {$match: {'__pulseAttempts.0': {$exists: true}}},
            {
              $project: {
                _id: 0,
                delivery: '$__pulseDelivery',
                attempt: {$arrayElemAt: ['$__pulseAttempts', 0]},
                ordered: {$literal: true},
              },
            },
          ],
        })
      } else {
        branches.push({
          collectionName: collections.history.collectionName,
          pipeline: [
            {
              $match: {
                consumerGroup: this.options.consumerGroup,
                topic,
                status: 'pending',
                nextAttemptAt: {$lte: now},
                lockToken: {$exists: false},
              },
            },
            {$sort: {nextAttemptAt: 1, createdAt: 1}},
            {$limit: concurrentPerTopicLimit},
            {$set: {__pulseAttempt: '$$ROOT'}},
            {
              $lookup: {
                from: collections.deliveries.collectionName,
                localField: 'deliveryId',
                foreignField: '_id',
                as: '__pulseDeliveries',
              },
            },
            {$match: {'__pulseDeliveries.0.status': 'pending'}},
            {
              $project: {
                _id: 0,
                attempt: '$__pulseAttempt',
                delivery: {$arrayElemAt: ['$__pulseDeliveries', 0]},
                ordered: {$literal: false},
              },
            },
          ],
        })
      }
    }

    const [first, ...remaining] = branches
    const pipeline: Document[] = [...first.pipeline]
    for (const branch of remaining) {
      pipeline.push({$unionWith: {coll: branch.collectionName, pipeline: branch.pipeline}})
    }
    const rootCollection =
      first.collectionName === collections.deliveries.collectionName
        ? collections.deliveries
        : collections.history
    const candidates = (await rootCollection
      .aggregate(pipeline)
      .toArray()) as unknown as ExecutionCandidate[]
    return shuffle(candidates)
  }

  private startExecution(execution: ClaimedExecution) {
    const promise = this.runExecution(execution)
    this.activeExecutions.add(promise)
    void promise.finally(() => {
      this.activeExecutions.delete(promise)
      this.wakeCoordinator()
    })
  }

  private async runExecution(execution: ClaimedExecution) {
    try {
      if (execution.kind === 'embedded') {
        await this.executeEmbeddedAttempt(execution.local, execution.delivery, execution.attempt)
      } else {
        await this.executeAttempt(
          execution.local,
          execution.delivery,
          execution.attempt,
          execution.orderedLease,
        )
      }
    } catch (error) {
      this.reportError(error)
    } finally {
      execution.local.running--
      if (execution.kind === 'legacy' && execution.orderedLease) {
        await this.releaseOrderedLease(execution.orderedLease).catch(error =>
          this.reportError(error),
        )
      }
    }
  }

  private async claimAttempt(candidate: HistoryDocument, workerId: string) {
    const now = new Date()
    const lockToken = uuidv7()
    return (
      (await this.getCollections().history.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'pending',
          nextAttemptAt: {$lte: now},
          lockToken: {$exists: false},
        },
        {
          $set: {
            startedAt: now,
            lockOwner: workerId,
            lockToken,
            lockedAt: now,
            lockedUntil: new Date(now.getTime() + this.options.lockTimeoutMs),
            heartbeatAt: now,
          },
        },
        {returnDocument: 'after'},
      )) ?? undefined
    )
  }

  private async releaseUnstartedAttempt(attempt: HistoryDocument) {
    await this.getCollections().history.updateOne(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $unset: {
          startedAt: '',
          lockOwner: '',
          lockToken: '',
          lockedAt: '',
          lockedUntil: '',
          heartbeatAt: '',
        },
      },
    )
  }

  private async executeAttempt(
    local: LocalSubscription,
    delivery: DeliveryDocument,
    attempt: HistoryDocument,
    orderedLease?: OrderedLease,
  ) {
    let lockLost = false
    let heartbeatRunning = false
    const heartbeat = async () => {
      // close() stops new work but waits for active callbacks. Their leases must keep
      // renewing until executeAttempt finishes or another replica can duplicate the work.
      if (heartbeatRunning || lockLost) return
      heartbeatRunning = true
      try {
        const now = new Date()
        const historyResult = await this.getCollections().history.updateOne(
          {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
          {
            $set: {
              heartbeatAt: now,
              lockedUntil: new Date(now.getTime() + this.options.lockTimeoutMs),
            },
          },
        )
        if (historyResult.modifiedCount === 0) lockLost = true

        if (orderedLease && !lockLost) {
          const leaseResult = await this.getCollections().subscriptions.updateOne(
            {_id: orderedLease.subscription._id, orderedLockToken: orderedLease.lockToken},
            {
              $set: {
                orderedLockedUntil: new Date(now.getTime() + this.options.lockTimeoutMs),
              },
            },
          )
          if (leaseResult.modifiedCount === 0) lockLost = true
        }
      } catch (error) {
        this.reportError(error)
      } finally {
        heartbeatRunning = false
      }
    }

    const interval = setInterval(
      () => void heartbeat(),
      Math.max(10, Math.floor(this.options.lockTimeoutMs / 3)),
    )
    interval.unref?.()

    try {
      const event = await this.getCollections().events.findOne({_id: delivery.eventId})
      if (!event) {
        const history = await this.finishAttemptWithError(
          attempt,
          serializeError(
            new Error('The event expired before it could be processed.'),
            'event_expired',
          ),
        )
        if (history) await this.finishDeliveryWithError(delivery, history)
        return
      }

      const received: PulseReceivedEvent = {
        id: event._id,
        topic: event.topic,
        data: event.data,
        publisher: event.publisher,
        headers: event.headers,
        createdAt: event.createdAt,
        expiresAt: event.expiresAt,
        consumerGroup: this.options.consumerGroup,
        attempt: attempt.attempt,
      }
      await this.handlerContext.run(true, () => local.handler(received))
      if (lockLost) {
        throw new PulseLockLostError(`Pulse lock was lost while processing event ${event._id}.`)
      }

      const history = await this.finishAttemptWithSuccess(attempt)
      if (!history) {
        throw new PulseLockLostError(`Pulse lock was lost while acknowledging event ${event._id}.`)
      }
      await this.finishDeliveryWithSuccess(delivery, history)
    } catch (error) {
      if (error instanceof PulseLockLostError || lockLost) {
        this.reportError(error)
        return
      }
      const history = await this.finishAttemptWithError(attempt, serializeError(error))
      if (!history) {
        this.reportError(
          new PulseLockLostError(
            `Pulse lock was lost while recording an error for event ${delivery.eventId}.`,
          ),
        )
        return
      }
      await this.afterAttemptError(delivery, history)
    } finally {
      clearInterval(interval)
    }
  }

  private async executeEmbeddedAttempt(
    local: LocalSubscription,
    delivery: DeliveryDocument,
    attempt: EmbeddedAttemptContext,
  ) {
    let lockLost = false
    let heartbeatRunning = false
    const heartbeat = async () => {
      if (heartbeatRunning || lockLost) return
      heartbeatRunning = true
      try {
        const now = new Date()
        const lockedUntil = new Date(now.getTime() + this.options.lockTimeoutMs)
        const result = await this.getCollections().deliveries.updateOne(
          {
            _id: delivery._id,
            executionVersion: 2,
            status: 'v2-processing',
            lockToken: attempt.lockToken,
          },
          {$set: {heartbeatAt: now, lockedUntil}},
        )
        if (result.modifiedCount === 0) lockLost = true
        else {
          attempt.heartbeatAt = now
          attempt.lockedUntil = lockedUntil
        }
      } catch (error) {
        this.reportError(error)
      } finally {
        heartbeatRunning = false
      }
    }

    const interval = setInterval(
      () => void heartbeat(),
      Math.max(10, Math.floor(this.options.lockTimeoutMs / 3)),
    )
    interval.unref?.()

    try {
      const event = await this.getCollections().events.findOne({_id: delivery.eventId})
      if (!event) {
        const finalized = await this.finishEmbeddedAttemptWithError(
          delivery,
          attempt,
          local.options,
          serializeError(
            new Error('The event expired before it could be processed.'),
            'event_expired',
          ),
        )
        if (!finalized) {
          throw new PulseLockLostError(
            `Pulse lock was lost while recording the missing event ${delivery.eventId}.`,
          )
        }
        return
      }

      const received: PulseReceivedEvent = {
        id: event._id,
        topic: event.topic,
        data: event.data,
        publisher: event.publisher,
        headers: event.headers,
        createdAt: event.createdAt,
        expiresAt: event.expiresAt,
        consumerGroup: this.options.consumerGroup,
        attempt: attempt.attempt,
      }
      await this.handlerContext.run(true, () => local.handler(received))
      if (lockLost) {
        throw new PulseLockLostError(`Pulse lock was lost while processing event ${event._id}.`)
      }

      const finalized = await this.finishEmbeddedAttemptWithSuccess(delivery, attempt)
      if (!finalized) {
        throw new PulseLockLostError(`Pulse lock was lost while acknowledging event ${event._id}.`)
      }
    } catch (error) {
      if (error instanceof PulseLockLostError || lockLost) {
        this.reportError(error)
        return
      }
      const finalized = await this.finishEmbeddedAttemptWithError(
        delivery,
        attempt,
        local.options,
        serializeEmbeddedError(error),
      )
      if (!finalized) {
        this.reportError(
          new PulseLockLostError(
            `Pulse lock was lost while recording an error for event ${delivery.eventId}.`,
          ),
        )
      }
    } finally {
      clearInterval(interval)
    }
  }

  private embeddedAttemptOutcome(
    attempt: EmbeddedAttemptContext,
    status: 'success' | 'error',
    endedAt: Date,
    error?: PulseHistoryError,
  ): EmbeddedAttemptDocument {
    return {
      _id: attempt._id,
      attempt: attempt.attempt,
      status,
      createdAt: attempt.createdAt,
      nextAttemptAt: attempt.nextAttemptAt,
      startedAt: attempt.startedAt,
      lockedAt: attempt.lockedAt,
      lockedUntil: attempt.lockedUntil,
      heartbeatAt: attempt.heartbeatAt,
      lockOwner: attempt.lockOwner,
      lockToken: attempt.lockToken,
      endedAt,
      durationMs: endedAt.getTime() - attempt.startedAt.getTime(),
      ...(error ? {error} : {}),
    }
  }

  private embeddedAttemptUnset(): Document {
    return {
      attemptId: '',
      attemptCreatedAt: '',
      nextAttemptAt: '',
      startedAt: '',
      lockOwner: '',
      lockToken: '',
      lockedAt: '',
      lockedUntil: '',
      heartbeatAt: '',
    }
  }

  private async finishEmbeddedAttemptWithSuccess(
    delivery: DeliveryDocument,
    attempt: EmbeddedAttemptContext,
  ) {
    const endedAt = new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    const result = await this.getCollections().deliveries.findOneAndUpdate(
      {
        _id: delivery._id,
        executionVersion: 2,
        status: 'v2-processing',
        lockToken: attempt.lockToken,
      },
      {
        $set: {
          status: 'v2-success',
          finalAttempt: attempt.attempt,
          updatedAt: endedAt,
          endedAt,
          ...(expiresAt ? {expiresAt} : {}),
        },
        $push: {
          attempts: {
            $each: [this.embeddedAttemptOutcome(attempt, 'success', endedAt)],
            $slice: -EMBEDDED_ATTEMPT_HISTORY_LIMIT,
          },
        },
        $unset: {...this.embeddedAttemptUnset(), error: '', ...(expiresAt ? {} : {expiresAt: ''})},
      } as Document,
      {returnDocument: 'after'},
    )
    if (result) {
      this.nextEmbeddedClaimAt = 0
      this.wakeCoordinator()
    }
    return result ?? undefined
  }

  private async finishEmbeddedAttemptWithError(
    delivery: DeliveryDocument,
    attempt: EmbeddedAttemptContext,
    options: ResolvedSubscribeOptions,
    error: PulseHistoryError,
    expiredBefore?: Date,
  ) {
    const endedAt = new Date()
    const terminal =
      error.code === 'event_expired' ||
      options.delivery === 'at-most-once' ||
      attempt.attempt > options.maxRetries
    const expiresAt = terminal ? getExpiresAt(endedAt, this.options.historyRetentionMs) : undefined
    const delay =
      options.retryDelayMs * options.retryBackoffMultiplier ** Math.max(0, attempt.attempt - 1)
    const filter: Filter<DeliveryDocument> = {
      _id: delivery._id,
      executionVersion: 2,
      status: 'v2-processing',
      lockToken: attempt.lockToken,
      ...(expiredBefore ? {lockedUntil: {$lte: expiredBefore}} : {}),
    }
    const set: Document = terminal
      ? {
          status: 'v2-error',
          finalAttempt: attempt.attempt,
          error,
          updatedAt: endedAt,
          endedAt,
          ...(expiresAt ? {expiresAt} : {}),
        }
      : {
          status: 'v2-pending',
          attemptId: uuidv7(),
          attemptCreatedAt: endedAt,
          nextAttemptAt: new Date(Date.now() + delay),
          updatedAt: endedAt,
        }
    const unset = this.embeddedAttemptUnset()
    if (!terminal) {
      delete unset.attemptId
      delete unset.attemptCreatedAt
      delete unset.nextAttemptAt
    }
    if (!expiresAt) unset.expiresAt = ''

    const result = await this.getCollections().deliveries.findOneAndUpdate(
      filter,
      {
        $set: set,
        $push: {
          attempts: {
            $each: [this.embeddedAttemptOutcome(attempt, 'error', endedAt, error)],
            $slice: -EMBEDDED_ATTEMPT_HISTORY_LIMIT,
          },
        },
        $unset: unset,
      } as Document,
      {returnDocument: 'after'},
    )
    if (result) {
      this.nextEmbeddedClaimAt = 0
      this.wakeCoordinator()
    }
    return result ?? undefined
  }

  private async finishAttemptWithSuccess(attempt: HistoryDocument) {
    const endedAt = new Date()
    const result = await this.getCollections().history.findOneAndUpdate(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $set: {
          status: 'success',
          endedAt,
          durationMs: attempt.startedAt ? endedAt.getTime() - attempt.startedAt.getTime() : 0,
          needsReconciliation: true,
        },
        $unset: {expiresAt: ''},
      },
      {returnDocument: 'after'},
    )
    return result ?? undefined
  }

  private async finishAttemptWithError(attempt: HistoryDocument, error: PulseHistoryError) {
    const endedAt = new Date()
    const result = await this.getCollections().history.findOneAndUpdate(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $set: {
          status: 'error',
          error,
          endedAt,
          durationMs: attempt.startedAt ? endedAt.getTime() - attempt.startedAt.getTime() : 0,
          needsReconciliation: true,
        },
        $unset: {expiresAt: ''},
      },
      {returnDocument: 'after'},
    )
    return result ?? undefined
  }

  private async afterAttemptError(delivery: DeliveryDocument, history: HistoryDocument) {
    const local = this.localSubscriptions.get(delivery.topic)
    const subscription =
      local?.document ??
      (await this.getCollections().subscriptions.findOne({
        consumerGroup: delivery.consumerGroup,
        topic: delivery.topic,
      }))
    if (!subscription) return

    const terminal =
      history.error?.code === 'event_expired' ||
      subscription.delivery === 'at-most-once' ||
      history.attempt > subscription.maxRetries
    if (terminal) {
      await this.finishDeliveryWithError(delivery, history)
      return
    }

    // Non-terminal evidence must outlive the retry delay and any service downtime.
    await this.getCollections().history.updateOne(
      {_id: history._id, status: 'error'},
      {$unset: {expiresAt: ''}},
    )
    const delay =
      subscription.retryDelayMs *
      subscription.retryBackoffMultiplier ** Math.max(0, history.attempt - 1)
    await this.ensureAttempt(delivery, history.attempt + 1, new Date(Date.now() + delay))
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: 'pending'},
      {$set: {updatedAt: new Date()}},
    )
    await this.getCollections().history.updateOne(
      {_id: history._id, status: 'error', needsReconciliation: true},
      {$unset: {needsReconciliation: ''}},
    )
    this.wakeCoordinator()
  }

  private async finishDeliveryWithSuccess(delivery: DeliveryDocument, history: HistoryDocument) {
    const endedAt = history.endedAt ?? new Date()
    const finalized = await this.getCollections().deliveries.findOneAndUpdate(
      {_id: delivery._id, status: 'pending'},
      {
        $set: {
          status: 'success',
          finalAttempt: history.attempt,
          updatedAt: endedAt,
          endedAt,
          needsReconciliation: true,
        },
        $unset: {error: '', expiresAt: ''},
      },
      {returnDocument: 'after'},
    )
    if (finalized) await this.applyTerminalRetention(finalized)
    this.wakeCoordinator()
  }

  private async finishDeliveryWithError(delivery: DeliveryDocument, history: HistoryDocument) {
    const endedAt = history.endedAt ?? new Date()
    const finalized = await this.getCollections().deliveries.findOneAndUpdate(
      {_id: delivery._id, status: 'pending'},
      {
        $set: {
          status: 'error',
          finalAttempt: history.attempt,
          error: history.error,
          updatedAt: endedAt,
          endedAt,
          needsReconciliation: true,
        },
        $unset: {expiresAt: ''},
      },
      {returnDocument: 'after'},
    )
    if (finalized) await this.applyTerminalRetention(finalized)
    this.wakeCoordinator()
  }

  private async applyTerminalRetention(delivery: DeliveryDocument) {
    const expiresAt = getExpiresAt(
      delivery.endedAt ?? delivery.updatedAt,
      this.options.historyRetentionMs,
    )
    if (!expiresAt) {
      await Promise.all([
        this.getCollections().history.updateMany(
          {deliveryId: delivery._id, needsReconciliation: true},
          {$unset: {needsReconciliation: ''}},
        ),
        this.getCollections().deliveries.updateOne(
          {_id: delivery._id, status: delivery.status, needsReconciliation: true},
          {$unset: {needsReconciliation: ''}},
        ),
      ])
      return
    }

    // Histories become expirable before their terminal delivery. If the process dies
    // between these writes, the delivery remains as a durable repair marker.
    await this.getCollections().history.updateMany(
      {deliveryId: delivery._id, status: {$in: ['success', 'error']}},
      {$set: {expiresAt}, $unset: {needsReconciliation: ''}},
    )
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: delivery.status},
      {$set: {expiresAt}, $unset: {needsReconciliation: ''}},
    )
  }

  private async ensureAttempt(delivery: DeliveryDocument, attempt: number, nextAttemptAt: Date) {
    const existing = await this.getCollections().history.findOne({
      deliveryId: delivery._id,
      attempt,
    })
    if (existing) return existing

    const document: HistoryDocument = {
      _id: uuidv7(),
      deliveryId: delivery._id,
      eventId: delivery.eventId,
      consumerGroup: delivery.consumerGroup,
      topic: delivery.topic,
      attempt,
      status: 'pending',
      createdAt: new Date(),
      nextAttemptAt,
    }
    try {
      await this.getCollections().history.insertOne(document)
      this.nextLegacyClaimAt = 0
      this.wakeCoordinator()
      return document
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error
      return await this.getCollections().history.findOne({deliveryId: delivery._id, attempt})
    }
  }

  private async reapExpiredAttempts(topics: string[], needsLegacyExecution = true) {
    if (topics.length === 0) return 0
    if (!needsLegacyExecution) {
      const reaped = await this.reapExpiredEmbeddedAttempts(topics, RECONCILIATION_BATCH_SIZE)
      if (reaped === RECONCILIATION_BATCH_SIZE) {
        this.nextReapAt = 0
        return reaped
      }
      this.scheduleNextReap()
      return reaped
    }

    const historyCollection = this.getCollections().history
    const now = new Date()
    const candidates = await historyCollection
      .find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        status: 'pending',
        lockedUntil: {$lte: now},
        lockToken: {$exists: true},
      })
      .sort({lockedUntil: 1})
      .limit(RECONCILIATION_BATCH_SIZE)
      .toArray()
    const reapedHistories = (
      await Promise.all(
        candidates.map(async candidate => {
          const endedAt = new Date()
          return await historyCollection.findOneAndUpdate(
            {
              _id: candidate._id,
              status: 'pending',
              lockToken: candidate.lockToken,
              lockedUntil: {$lte: endedAt},
            },
            {
              $set: {
                status: 'error',
                error: serializeError(
                  new Error('The worker lock expired before the attempt completed.'),
                  'worker_lost',
                ),
                endedAt,
                durationMs: candidate.startedAt
                  ? endedAt.getTime() - candidate.startedAt.getTime()
                  : 0,
                needsReconciliation: true,
              },
              $unset: {expiresAt: ''},
            },
            {returnDocument: 'after'},
          )
        }),
      )
    ).filter((history): history is HistoryDocument => Boolean(history))

    const deliveryIds = reapedHistories.map(history => history.deliveryId)
    const deliveries =
      deliveryIds.length === 0
        ? []
        : await this.getCollections()
            .deliveries.find({_id: {$in: deliveryIds}})
            .toArray()
    const deliveryById = new Map(deliveries.map(delivery => [delivery._id, delivery]))
    for (const history of reapedHistories) {
      const delivery = deliveryById.get(history.deliveryId)
      if (delivery?.status === 'pending') await this.afterAttemptError(delivery, history)
      else if (delivery) await this.applyTerminalRetention(delivery)
    }

    const remaining = RECONCILIATION_BATCH_SIZE - candidates.length
    const embeddedReaped =
      remaining > 0 ? await this.reapExpiredEmbeddedAttempts(topics, remaining) : 0
    const reaped = reapedHistories.length + embeddedReaped
    if (candidates.length === RECONCILIATION_BATCH_SIZE || embeddedReaped === remaining) {
      this.nextReapAt = 0
      return reaped
    }

    this.scheduleNextReap()
    return reaped
  }

  private scheduleNextReap() {
    const idleInterval = Math.max(
      this.options.pollIntervalMs,
      Math.min(MAX_REAPER_IDLE_INTERVAL_MS, Math.max(10, this.options.lockTimeoutMs / 3)),
    )
    this.nextReapAt = Date.now() + idleInterval + Math.floor(Math.random() * idleInterval * 0.2)
  }

  private embeddedAttemptContext(delivery: DeliveryDocument): EmbeddedAttemptContext | undefined {
    if (
      typeof delivery.attempt !== 'number' ||
      !delivery.attemptId ||
      !delivery.attemptCreatedAt ||
      !delivery.nextAttemptAt ||
      !delivery.startedAt ||
      !delivery.lockedAt ||
      !delivery.lockedUntil ||
      !delivery.heartbeatAt ||
      !delivery.lockOwner ||
      !delivery.lockToken
    ) {
      return undefined
    }
    return {
      _id: delivery.attemptId,
      attempt: delivery.attempt,
      createdAt: delivery.attemptCreatedAt,
      nextAttemptAt: delivery.nextAttemptAt,
      startedAt: delivery.startedAt,
      lockedAt: delivery.lockedAt,
      lockedUntil: delivery.lockedUntil,
      heartbeatAt: delivery.heartbeatAt,
      lockOwner: delivery.lockOwner,
      lockToken: delivery.lockToken,
    }
  }

  private async reapExpiredEmbeddedAttempts(topics: string[], limit: number) {
    if (limit <= 0) return 0
    if (!this.embeddedWorkEnabled) {
      this.embeddedWorkEnabled = [...this.localSubscriptions.values()].some(
        local => local.options.executionVersion === 2 || local.document.embeddedExecutionSeen,
      )
      if (!this.embeddedWorkEnabled) return 0
    }
    const now = new Date()
    const candidates = await this.getCollections()
      .deliveries.find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        executionVersion: 2,
        status: 'v2-processing',
        lockedUntil: {$lte: now},
      })
      .sort({lockedUntil: 1})
      .limit(limit)
      .toArray()
    let reaped = 0
    for (const delivery of candidates) {
      const attempt = this.embeddedAttemptContext(delivery)
      if (!attempt) continue
      const local = this.localSubscriptions.get(delivery.topic)
      const subscription =
        local?.document ??
        (await this.getCollections().subscriptions.findOne({
          consumerGroup: delivery.consumerGroup,
          topic: delivery.topic,
        }))
      if (!subscription) continue
      const options = local?.options ?? optionsFromDocument(subscription, this.options.workerCount)
      const result = await this.finishEmbeddedAttemptWithError(
        delivery,
        attempt,
        options,
        serializeEmbeddedError(
          new Error('The worker lock expired before the attempt completed.'),
          'worker_lost',
        ),
        now,
      )
      if (result) reaped++
    }
    return reaped
  }

  private async reconcileHistoryOutcomes(topics: string[], limit: number) {
    if (limit <= 0) return 0
    const collections = this.getCollections()
    const histories = await collections.history
      .find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        needsReconciliation: true,
      })
      .limit(limit)
      .toArray()
    if (histories.length === 0) return 0

    const deliveries = await collections.deliveries
      .find({_id: {$in: histories.map(history => history.deliveryId)}})
      .toArray()
    const deliveryById = new Map(deliveries.map(delivery => [delivery._id, delivery]))
    for (const history of histories) {
      const delivery = deliveryById.get(history.deliveryId)
      if (!delivery) {
        const expiresAt = getExpiresAt(
          history.endedAt ?? history.createdAt,
          this.options.historyRetentionMs,
        )
        await collections.history.updateOne(
          {_id: history._id, needsReconciliation: true},
          expiresAt
            ? {$set: {expiresAt}, $unset: {needsReconciliation: ''}}
            : {$unset: {needsReconciliation: ''}},
        )
        continue
      }
      if (delivery.status !== 'pending') await this.applyTerminalRetention(delivery)
      else if (history.status === 'success') await this.finishDeliveryWithSuccess(delivery, history)
      else if (history.status === 'error') await this.afterAttemptError(delivery, history)
      await collections.history.updateOne(
        {_id: history._id, needsReconciliation: true},
        {$unset: {needsReconciliation: ''}},
      )
    }
    return histories.length
  }

  private async reconcileDeliveryMarkers(topics: string[], limit: number) {
    if (limit <= 0) return 0
    const collections = this.getCollections()
    const deliveries = await collections.deliveries
      .find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        needsReconciliation: true,
      })
      .limit(limit)
      .toArray()
    if (deliveries.length === 0) return 0

    const histories = await collections.history
      .find({deliveryId: {$in: deliveries.map(delivery => delivery._id)}})
      .sort({deliveryId: 1, attempt: -1})
      .toArray()
    const latestByDelivery = new Map<string, HistoryDocument>()
    const successByDelivery = new Map<string, HistoryDocument>()
    for (const history of histories) {
      if (!latestByDelivery.has(history.deliveryId)) {
        latestByDelivery.set(history.deliveryId, history)
      }
      if (history.status === 'success' && !successByDelivery.has(history.deliveryId)) {
        successByDelivery.set(history.deliveryId, history)
      }
    }

    for (const delivery of deliveries) {
      if (delivery.status !== 'pending') {
        await this.applyTerminalRetention(delivery)
        continue
      }
      const successful = successByDelivery.get(delivery._id)
      const latest = latestByDelivery.get(delivery._id)
      if (successful) await this.finishDeliveryWithSuccess(delivery, successful)
      else if (!latest) await this.ensureAttempt(delivery, 1, delivery.createdAt)
      else if (latest.status === 'error') await this.afterAttemptError(delivery, latest)
      await collections.deliveries.updateOne(
        {_id: delivery._id, status: 'pending', needsReconciliation: true},
        {$unset: {needsReconciliation: ''}},
      )
    }
    return deliveries.length
  }

  private async reconcileDeliveries(topics: string[]) {
    if (topics.length === 0) return 0
    const historyCount = await this.reconcileHistoryOutcomes(topics, RECONCILIATION_BATCH_SIZE)
    const deliveryCount = await this.reconcileDeliveryMarkers(
      topics,
      RECONCILIATION_BATCH_SIZE - historyCount,
    )
    const reconciled = historyCount + deliveryCount
    this.nextReconciliationAt =
      reconciled === RECONCILIATION_BATCH_SIZE ? 0 : Date.now() + RECONCILIATION_INTERVAL_MS
    return reconciled
  }

  private async cleanupSuccessfulDeliveries(topics: string[]) {
    this.nextDeliveryCleanupAt = Date.now() + DELIVERY_CLEANUP_INTERVAL_MS
    if (topics.length === 0) return 0

    const selectedTopics = circularBatch(
      topics,
      this.deliveryCleanupTopicOffset,
      DISCOVERY_TOPIC_BATCH_SIZE,
    )
    const topicAdvance = selectedTopics.length === topics.length ? 1 : selectedTopics.length
    this.deliveryCleanupTopicOffset =
      (this.deliveryCleanupTopicOffset + topicAdvance) % topics.length

    const now = new Date()
    const collections = this.getCollections()
    const subscriptions = await collections.subscriptions
      .find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: selectedTopics},
        discoveryLockOwner: this.coordinatorId,
        discoveryLockedUntil: {$gt: now},
      })
      .toArray()
    const subscriptionsByTopic = new Map(
      subscriptions.map(subscription => [subscription.topic, subscription]),
    )
    const candidateIds: string[] = []
    for (const topic of selectedTopics) {
      const subscription = subscriptionsByTopic.get(topic)
      if (!subscription) continue

      const cursorBranches: Document[] = []
      if (subscription.cursorSequence) {
        cursorBranches.push({
          eventSequence: {$lt: subscription.cursorSequence},
        })
        if (subscription.cursorSequenceEventId !== undefined) {
          cursorBranches.push({
            eventSequence: subscription.cursorSequence,
            eventId: {$lte: subscription.cursorSequenceEventId},
          })
        }
      }
      if (subscription.cursorCreatedAt) {
        cursorBranches.push({
          eventSequence: {$exists: false},
          eventCreatedAt: {$lt: subscription.cursorCreatedAt},
        })
        if (subscription.cursorEventId !== undefined) {
          cursorBranches.push({
            eventSequence: {$exists: false},
            eventCreatedAt: subscription.cursorCreatedAt,
            eventId: {$lte: subscription.cursorEventId},
          })
        }
      }
      if (cursorBranches.length === 0) continue

      const remaining = DELIVERY_CLEANUP_BATCH_SIZE - candidateIds.length
      const candidates = await collections.deliveries
        .find(
          {
            consumerGroup: this.options.consumerGroup,
            topic,
            status: 'success',
            ...(this.options.historyRetentionMs === null ? {} : {expiresAt: {$exists: true}}),
            $or: cursorBranches,
          },
          {projection: {_id: 1}},
        )
        .limit(remaining)
        .toArray()
      candidateIds.push(...candidates.map(delivery => delivery._id))
      if (candidateIds.length === DELIVERY_CLEANUP_BATCH_SIZE) break
    }
    if (candidateIds.length === 0) return 0

    const result = await collections.deliveries.deleteMany({_id: {$in: candidateIds}})
    return result.deletedCount
  }

  /*
   * Cross-collection writes set needsReconciliation on their durable first write and clear it
   * only after the dependent write succeeds. Recovery therefore reads only the tiny partial
   * indexes instead of walking every healthy delivery while a backlog is draining.
   */

  private async acquireOrderedLease(
    local: LocalSubscription,
    workerId: string,
  ): Promise<OrderedLease | undefined> {
    const now = new Date()
    const lockToken = uuidv7()
    const subscription = await this.getCollections().subscriptions.findOneAndUpdate(
      {
        _id: local.document._id,
        $or: [{orderedLockedUntil: {$exists: false}}, {orderedLockedUntil: {$lte: now}}],
      },
      {
        $set: {
          orderedLockOwner: workerId,
          orderedLockToken: lockToken,
          orderedLockedUntil: new Date(now.getTime() + this.options.lockTimeoutMs),
        },
      },
      {returnDocument: 'after'},
    )
    return subscription ? {subscription, lockToken} : undefined
  }

  private async releaseOrderedLease(lease: OrderedLease) {
    await this.getCollections().subscriptions.updateOne(
      {_id: lease.subscription._id, orderedLockToken: lease.lockToken},
      {
        $unset: {
          orderedLockOwner: '',
          orderedLockToken: '',
          orderedLockedUntil: '',
        },
      },
    )
  }

  private async refreshDiscoveryLeases() {
    const subscriptionRevision = this.localSubscriptionRevision
    const locals = [...this.localSubscriptions.values()].filter(local => !local.unsubscribed)
    const activeTopics = new Set(locals.map(local => local.document.topic))
    for (const topic of this.discoveryLeases.keys()) {
      if (!activeTopics.has(topic)) this.discoveryLeases.delete(topic)
    }
    if (locals.length === 0) {
      this.discoveryRefreshAt = Number.POSITIVE_INFINITY
      return
    }

    const now = new Date()
    const renewalWindow = Math.max(1, Math.floor(this.options.discoveryLockTimeoutMs / 3))
    const renewalDue = [...this.discoveryLeases.values()].some(
      lease => lease.lockedUntil.getTime() - now.getTime() <= renewalWindow,
    )
    if (!renewalDue && now.getTime() < this.discoveryRefreshAt) return

    const subscriptions = this.getCollections().subscriptions
    let documents = await subscriptions
      .find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: [...activeTopics]},
      })
      .toArray()
    const byTopic = new Map(documents.map(document => [document.topic, document]))
    const operations: AnyBulkWriteOperation<SubscriptionDocument>[] = []

    for (const local of locals) {
      const document = byTopic.get(local.document.topic)
      if (!document) {
        this.discoveryLeases.delete(local.document.topic)
        continue
      }
      this.updateLocalSubscription(local, document)

      let lease = this.discoveryLeases.get(document.topic)
      const observedToken = document.discoveryLockToken
      const observedLockedUntil = document.discoveryLockedUntil
      const ownedByThisProcess =
        document.discoveryLockOwner === this.coordinatorId &&
        typeof observedToken === 'string' &&
        observedLockedUntil instanceof Date &&
        observedLockedUntil > now
      if (
        ownedByThisProcess &&
        !lease &&
        typeof observedToken === 'string' &&
        observedLockedUntil instanceof Date
      ) {
        lease = {
          subscription: document,
          lockToken: observedToken,
          lockedUntil: observedLockedUntil,
        }
        this.discoveryLeases.set(document.topic, lease)
      }
      if (
        lease &&
        (document.discoveryLockToken !== lease.lockToken ||
          !(document.discoveryLockedUntil instanceof Date) ||
          document.discoveryLockedUntil <= now)
      ) {
        this.discoveryLeases.delete(document.topic)
        lease = undefined
      }

      const lockedUntil = new Date(now.getTime() + this.options.discoveryLockTimeoutMs)
      if (lease) {
        lease.subscription = document
        if (!(observedLockedUntil instanceof Date)) {
          this.discoveryLeases.delete(document.topic)
          continue
        }
        lease.lockedUntil = observedLockedUntil
        if (lease.lockedUntil.getTime() - now.getTime() <= renewalWindow) {
          operations.push({
            updateOne: {
              filter: {_id: document._id, discoveryLockToken: lease.lockToken},
              update: {
                $set: {
                  discoveryLockOwner: this.coordinatorId,
                  discoveryLockedUntil: lockedUntil,
                },
              },
            },
          })
        }
        continue
      }

      const lockExpired =
        !(document.discoveryLockedUntil instanceof Date) || document.discoveryLockedUntil <= now
      if (!lockExpired) continue
      const lockToken = uuidv7()
      operations.push({
        updateOne: {
          filter: {
            _id: document._id,
            $or: [{discoveryLockedUntil: {$exists: false}}, {discoveryLockedUntil: {$lte: now}}],
          },
          update: {
            $set: {
              discoveryLockOwner: this.coordinatorId,
              discoveryLockToken: lockToken,
              discoveryLockedUntil: lockedUntil,
            },
          },
        },
      })
    }

    if (operations.length > 0) {
      await subscriptions.bulkWrite(operations, {ordered: false})
      documents = await subscriptions
        .find({
          consumerGroup: this.options.consumerGroup,
          topic: {$in: [...activeTopics]},
        })
        .toArray()
    }

    const confirmedTopics = new Set<string>()
    let earliestForeignExpiry = Number.POSITIVE_INFINITY
    for (const document of documents) {
      const local = this.localSubscriptions.get(document.topic)
      if (!local || local.unsubscribed) continue
      this.updateLocalSubscription(local, document)
      if (
        document.discoveryLockOwner === this.coordinatorId &&
        typeof document.discoveryLockToken === 'string' &&
        document.discoveryLockedUntil instanceof Date &&
        document.discoveryLockedUntil > now
      ) {
        confirmedTopics.add(document.topic)
        this.discoveryLeases.set(document.topic, {
          subscription: document,
          lockToken: document.discoveryLockToken,
          lockedUntil: document.discoveryLockedUntil,
        })
      } else if (document.discoveryLockedUntil instanceof Date) {
        earliestForeignExpiry = Math.min(
          earliestForeignExpiry,
          document.discoveryLockedUntil.getTime(),
        )
      }
    }
    for (const topic of this.discoveryLeases.keys()) {
      if (activeTopics.has(topic) && !confirmedTopics.has(topic)) {
        this.discoveryLeases.delete(topic)
      }
    }

    const earliestRenewal = Math.min(
      ...[...this.discoveryLeases.values()].map(
        lease => lease.lockedUntil.getTime() - renewalWindow,
      ),
      Number.POSITIVE_INFINITY,
    )
    const foreignRetry = Number.isFinite(earliestForeignExpiry)
      ? earliestForeignExpiry + Math.floor(Math.random() * this.options.pollIntervalMs)
      : Number.POSITIVE_INFINITY
    const nextRefreshAt = Math.min(
      earliestRenewal,
      foreignRetry,
      now.getTime() + Math.max(this.options.pollIntervalMs, this.options.discoveryLockTimeoutMs),
    )
    if (subscriptionRevision !== this.localSubscriptionRevision) {
      this.discoveryRefreshAt = 0
      this.wakeCoordinator()
    } else {
      this.discoveryRefreshAt = nextRefreshAt
    }
  }

  private discoverySubscriptionsInFairBatch() {
    const locals = [...this.localSubscriptions.values()].filter(
      local => !local.unsubscribed && this.discoveryLeases.has(local.document.topic),
    )
    const selected = circularBatch(locals, this.discoveryTopicOffset, DISCOVERY_TOPIC_BATCH_SIZE)
    if (locals.length > 0) {
      this.discoveryTopicOffset = (this.discoveryTopicOffset + selected.length) % locals.length
    }
    return selected
  }

  private async releaseDiscoveryLeaseForTopic(topic: string) {
    const lease = this.discoveryLeases.get(topic)
    if (!lease) return
    this.discoveryLeases.delete(topic)
    await this.getCollections().subscriptions.updateOne(
      {_id: lease.subscription._id, discoveryLockToken: lease.lockToken},
      {
        $unset: {
          discoveryLockOwner: '',
          discoveryLockToken: '',
          discoveryLockedUntil: '',
        },
      },
    )
  }

  private async releaseAllDiscoveryLeases() {
    const leases = [...this.discoveryLeases.values()]
    this.discoveryLeases.clear()
    if (leases.length === 0) return
    await this.getCollections().subscriptions.bulkWrite(
      leases.map<AnyBulkWriteOperation<SubscriptionDocument>>(lease => ({
        updateOne: {
          filter: {_id: lease.subscription._id, discoveryLockToken: lease.lockToken},
          update: {
            $unset: {
              discoveryLockOwner: '',
              discoveryLockToken: '',
              discoveryLockedUntil: '',
            },
          },
        },
      })),
      {ordered: false},
    )
  }

  private async advanceDiscoveryCursor(
    subscription: SubscriptionDocument,
    cursor: Pick<
      SubscriptionDocument,
      'cursorCreatedAt' | 'cursorEventId' | 'cursorSequence' | 'cursorSequenceEventId'
    >,
    expectedLockToken: string,
  ) {
    const sequenceFilter = cursor.cursorSequence
      ? {
          $or: [
            {cursorSequence: {$exists: false}},
            {cursorSequence: {$lt: cursor.cursorSequence}},
            {
              cursorSequence: cursor.cursorSequence,
              cursorSequenceEventId: {$lt: cursor.cursorSequenceEventId ?? ''},
            },
          ],
        }
      : undefined
    const legacyFilter = cursor.cursorCreatedAt
      ? {
          $or: [
            {cursorCreatedAt: {$exists: false}},
            {cursorCreatedAt: {$lt: cursor.cursorCreatedAt}},
            {
              cursorCreatedAt: cursor.cursorCreatedAt,
              cursorEventId: {$lt: cursor.cursorEventId ?? ''},
            },
          ],
        }
      : undefined
    const lease = this.discoveryLeases.get(subscription.topic)
    if (!lease || lease.lockToken !== expectedLockToken) {
      return (
        (await this.getCollections().subscriptions.findOne({_id: subscription._id})) ?? subscription
      )
    }
    const advanced = await this.getCollections().subscriptions.findOneAndUpdate(
      {
        _id: subscription._id,
        discoveryLockToken: expectedLockToken,
        ...(sequenceFilter ?? legacyFilter ?? {}),
      },
      {
        $set: {
          ...cursor,
          updatedAt: new Date(),
        },
      },
      {returnDocument: 'after'},
    )
    if (advanced) return advanced

    const current = await this.getCollections().subscriptions.findOne({_id: subscription._id})
    if (current) return current
    throw new Error(
      `Pulse subscription disappeared for ${subscription.consumerGroup}/${subscription.topic}.`,
    )
  }

  private async getOrCreateSubscription(
    topic: string,
    requestedOptions: ResolvedSubscribeOptions,
    userOptions: PulseSubscribeOptions,
  ): Promise<SubscriptionDocument> {
    const subscriptions = this.getCollections().subscriptions
    let document = await subscriptions.findOne({consumerGroup: this.options.consumerGroup, topic})
    if (!document) {
      const now = new Date()
      const latest =
        requestedOptions.offsetReset === 'latest'
          ? await this.getCollections().events.findOne(
              {topic, sequence: {$exists: false}},
              {sort: {createdAt: -1, _id: -1}},
            )
          : undefined
      const latestSequenced =
        requestedOptions.offsetReset === 'latest'
          ? await this.getCollections().events.findOne(
              {topic, sequence: {$exists: true}},
              {sort: {sequence: -1, _id: -1}},
            )
          : undefined
      const candidate: SubscriptionDocument = {
        _id: uuidv7(),
        consumerGroup: this.options.consumerGroup,
        topic,
        ...persistedConfig(requestedOptions),
        ...(requestedOptions.executionVersion === 2 ? {embeddedExecutionSeen: true as const} : {}),
        createdAt: now,
        updatedAt: now,
        ...(requestedOptions.offsetReset === 'latest'
          ? {
              cursorCreatedAt: latest?.createdAt ?? now,
              cursorEventId: latest?._id ?? '',
              ...(latestSequenced?.sequence
                ? {
                    cursorSequence: latestSequenced.sequence,
                    cursorSequenceEventId: latestSequenced._id,
                  }
                : {}),
            }
          : {}),
      }
      try {
        await subscriptions.insertOne(candidate)
        document = candidate
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error
        document = await subscriptions.findOne({
          consumerGroup: this.options.consumerGroup,
          topic,
        })
      }
    }
    if (!document) {
      throw new Error(
        `Failed to create Pulse subscription for ${this.options.consumerGroup}/${topic}.`,
      )
    }

    while (true) {
      const existingVersion = document.configVersion ?? 0
      if (requestedOptions.configVersion < existingVersion) return document

      const desiredOptions = {
        ...requestedOptions,
        ordered: userOptions.ordered ?? document.ordered,
        executionVersion:
          userOptions.executionVersion ??
          document.executionVersion ??
          requestedOptions.executionVersion,
      }
      if (requestedOptions.configVersion === existingVersion) {
        if (configsMatch(document, desiredOptions)) return document
        throw new PulseConfigurationError(
          `Subscription configuration for ${this.options.consumerGroup}/${topic} does not match ` +
            `the persisted configuration at configVersion ${existingVersion}. Increase ` +
            `configVersion to change it. Existing=${JSON.stringify(subscriptionConfig(document))}, ` +
            `requested=${JSON.stringify(persistedConfig(desiredOptions))}.`,
        )
      }

      const updated = await subscriptions.findOneAndUpdate(
        {_id: document._id, ...configVersionFilter(existingVersion)},
        {
          $set: {
            ...persistedConfig(desiredOptions),
            ...(desiredOptions.executionVersion === 2
              ? {embeddedExecutionSeen: true as const}
              : {}),
            updatedAt: new Date(),
          },
        },
        {returnDocument: 'after'},
      )
      if (updated) return updated

      document = await subscriptions.findOne({_id: document._id})
      if (!document) {
        throw new Error(
          `Pulse subscription disappeared for ${this.options.consumerGroup}/${topic}.`,
        )
      }
    }
  }

  private updateLocalSubscription(local: LocalSubscription, document: SubscriptionDocument) {
    const executionVersion = local.options.executionVersion
    local.document = document
    local.options = optionsFromDocument(document, local.configuredMaxConcurrency)
    if (local.options.executionVersion !== executionVersion) this.invalidateLegacyExecutionState()
  }

  private toSubscriptionInfo(local: LocalSubscription): PulseSubscriptionInfo {
    return {
      id: local.document._id,
      topic: local.document.topic,
      consumerGroup: local.document.consumerGroup,
      configVersion: local.options.configVersion,
      executionVersion: local.options.executionVersion,
      ordered: local.options.ordered,
      offsetReset: local.options.offsetReset,
      delivery: local.options.delivery,
      maxRetries: local.options.maxRetries,
      retryDelayMs: local.options.retryDelayMs,
      retryBackoffMultiplier: local.options.retryBackoffMultiplier,
      maxConcurrency: local.options.maxConcurrency,
    }
  }

  private waitForCoordinator() {
    if (!this.running) return Promise.resolve()
    return new Promise<void>(resolve => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        clearTimeout(timer)
        this.wakeWaiters.delete(finish)
        resolve()
      }
      const leaseRenewalInterval = Math.max(1, Math.floor(this.options.discoveryLockTimeoutMs / 3))
      const waitMs =
        this.discoveryLeases.size === 0
          ? this.options.pollIntervalMs
          : Math.min(this.options.pollIntervalMs, leaseRenewalInterval)
      const timer = setTimeout(finish, waitMs)
      timer.unref?.()
      this.wakeWaiters.add(finish)
    })
  }

  private wakeCoordinator() {
    for (const wake of [...this.wakeWaiters]) wake()
  }

  private requestDiscovery() {
    this.discoveryRequestRevision++
    this.wakeCoordinator()
  }

  private reportError(error: unknown) {
    const normalized = error instanceof Error ? error : new Error(String(error))
    try {
      this.options.onError(normalized)
    } catch {
      // User error reporting must never stop Pulse workers.
    }
  }

  private getCollections() {
    if (!this.collections) throw new Error('Pulse has not connected to MongoDB yet.')
    return this.collections
  }

  private async closeInternal() {
    this.running = false
    this.wakeCoordinator()
    await this.readyPromise.catch(() => undefined)
    await this.coordinatorPromise?.catch(() => undefined)
    await this.releaseAllDiscoveryLeases().catch(error => this.reportError(error))
    await Promise.allSettled([...this.activeExecutions])
    await this.client.close()
  }
}

export function connect<TEvents extends PulseEventMap = Record<string, unknown>>(
  options: PulseConnectOptions,
) {
  return new Pulse<TEvents>(options)
}
