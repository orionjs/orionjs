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
  DeliveryAttemptDocument,
  DeliveryDocument,
  EventDocument,
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
const MAX_REAPER_IDLE_INTERVAL_MS = 10_000
const ATTEMPT_HISTORY_LIMIT = 10
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

interface DiscoveryLease {
  subscription: SubscriptionDocument
  lockToken: string
  lockedUntil: Date
}

interface DeliveryAttemptContext {
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

interface ConcurrentClaimedExecution {
  local: LocalSubscription
  delivery: DeliveryDocument
  attempt: DeliveryAttemptContext
}

type ClaimedExecution = ConcurrentClaimedExecution

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
      'changeStreams is no longer supported. Pulse always uses polling.',
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
    offsetReset: options.offsetReset ?? 'latest',
    delivery: options.delivery ?? 'at-least-once',
    maxRetries: options.maxRetries ?? 3,
    retryDelayMs: options.retryDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    maxConcurrency: options.maxConcurrency ?? workerCount,
  }

  assertNonNegativeInteger(resolved.configVersion, 'configVersion')
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

function serializeExecutionError(error: unknown, code = 'handler_error'): PulseHistoryError {
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
    maxConcurrency: configuredMaxConcurrency,
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
  private deliveryCleanupTopicOffset = 0
  private nextConcurrentClaimAt = 0
  private db?: Db
  private collections?: PulseCollections
  private coordinatorPromise?: Promise<void>
  private discoveryRequestRevision = 0
  private handledDiscoveryRequestRevision = 0
  private nextDiscoveryAt = 0
  private nextReapAt = 0
  private nextDeliveryCleanupAt = Date.now() + DELIVERY_CLEANUP_INTERVAL_MS
  private running = true
  private closePromise?: Promise<void>

  constructor(options: PulseConnectOptions) {
    this.options = resolveOptions(options)
    this.client = new MongoClient(this.options.connectionString, {
      appName: '@orion-js/pulse',
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
      const document = await this.getOrCreateSubscription(topic, requestedOptions)
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

    const leaderTopics = [...this.discoveryLeases.keys()].filter(topic =>
      this.localSubscriptions.has(topic),
    )
    let reaped = 0
    let cleaned = 0
    if (leaderTopics.length > 0) {
      const now = Date.now()
      if (now >= this.nextReapAt) {
        reaped = await this.reapExpiredAttempts(leaderTopics)
      }
      if (now >= this.nextDeliveryCleanupAt) {
        cleaned = await this.cleanupSuccessfulDeliveries(leaderTopics)
      }
    }

    let dispatched = false
    const capacity = this.options.workerCount - this.activeExecutions.size
    const executions = capacity > 0 ? await this.claimExecutions(capacity) : []
    for (const execution of executions) {
      if (!this.running) break
      this.startExecution(execution)
      dispatched = true
    }
    return discovery.discovered || reaped > 0 || cleaned > 0 || dispatched
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
      return {
        _id: uuidv7(),
        eventId: event._id,
        consumerGroup: this.options.consumerGroup,
        topic: event.topic,
        eventCreatedAt: event.createdAt,
        ...(event.sequence ? {eventSequence: event.sequence} : {}),
        status: 'v2-pending' as const,
        attempt: 0,
        attemptId: uuidv7(),
        attemptCreatedAt: createdAt,
        nextAttemptAt: createdAt,
        attempts: [],
        createdAt,
        updatedAt: createdAt,
      } satisfies DeliveryDocument
    })
    this.nextConcurrentClaimAt = 0
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
  }

  private async claimExecutions(capacity: number): Promise<ClaimedExecution[]> {
    if (capacity <= 0) return []
    if (Date.now() < this.nextConcurrentClaimAt) return []
    const executions = await this.claimConcurrentExecutions(capacity)
    this.nextConcurrentClaimAt =
      executions.length === 0 ? Date.now() + this.options.pollIntervalMs : 0
    return executions
  }

  private async claimConcurrentExecutions(capacity: number): Promise<ConcurrentClaimedExecution[]> {
    if (capacity <= 0) return []
    const deliveries = this.getCollections().deliveries
    const executions: ConcurrentClaimedExecution[] = []

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
          await this.releaseUnstartedConcurrentAttempt(claimed)
          continue
        }

        local.running++
        executions.push({
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
    await this.releaseUnstartedConcurrentAttempt(execution.delivery)
    execution.local.running--
  }

  private async releaseUnstartedConcurrentAttempt(delivery: DeliveryDocument) {
    if (!delivery.lockToken) return
    await this.getCollections().deliveries.updateOne(
      {
        _id: delivery._id,
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
      await this.executeConcurrentAttempt(execution.local, execution.delivery, execution.attempt)
    } catch (error) {
      this.reportError(error)
    } finally {
      execution.local.running--
    }
  }

  private async executeConcurrentAttempt(
    local: LocalSubscription,
    delivery: DeliveryDocument,
    attempt: DeliveryAttemptContext,
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
        const finalized = await this.finishConcurrentAttemptWithError(
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

      const finalized = await this.finishConcurrentAttemptWithSuccess(delivery, attempt)
      if (!finalized) {
        throw new PulseLockLostError(`Pulse lock was lost while acknowledging event ${event._id}.`)
      }
    } catch (error) {
      if (error instanceof PulseLockLostError || lockLost) {
        this.reportError(error)
        return
      }
      const finalized = await this.finishConcurrentAttemptWithError(
        delivery,
        attempt,
        local.options,
        serializeExecutionError(error),
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

  private attemptOutcome(
    attempt: DeliveryAttemptContext,
    status: 'success' | 'error',
    endedAt: Date,
    error?: PulseHistoryError,
  ): DeliveryAttemptDocument {
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

  private attemptUnset(): Document {
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

  private async finishConcurrentAttemptWithSuccess(
    delivery: DeliveryDocument,
    attempt: DeliveryAttemptContext,
  ) {
    const endedAt = new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    const result = await this.getCollections().deliveries.findOneAndUpdate(
      {
        _id: delivery._id,
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
            $each: [this.attemptOutcome(attempt, 'success', endedAt)],
            $slice: -ATTEMPT_HISTORY_LIMIT,
          },
        },
        $unset: {...this.attemptUnset(), error: '', ...(expiresAt ? {} : {expiresAt: ''})},
      } as Document,
      {returnDocument: 'after'},
    )
    if (result) {
      this.nextConcurrentClaimAt = 0
      this.wakeCoordinator()
    }
    return result ?? undefined
  }

  private async finishConcurrentAttemptWithError(
    delivery: DeliveryDocument,
    attempt: DeliveryAttemptContext,
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
    const unset = this.attemptUnset()
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
            $each: [this.attemptOutcome(attempt, 'error', endedAt, error)],
            $slice: -ATTEMPT_HISTORY_LIMIT,
          },
        },
        $unset: unset,
      } as Document,
      {returnDocument: 'after'},
    )
    if (result) {
      this.nextConcurrentClaimAt = 0
      this.wakeCoordinator()
    }
    return result ?? undefined
  }

  private async reapExpiredAttempts(topics: string[]) {
    if (topics.length === 0) return 0
    const reaped = await this.reapExpiredConcurrentAttempts(topics, RECONCILIATION_BATCH_SIZE)
    if (reaped === RECONCILIATION_BATCH_SIZE) {
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

  private attemptContext(delivery: DeliveryDocument): DeliveryAttemptContext | undefined {
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

  private async reapExpiredConcurrentAttempts(topics: string[], limit: number) {
    if (limit <= 0) return 0
    const now = new Date()
    const candidates = await this.getCollections()
      .deliveries.find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        status: 'v2-processing',
        lockedUntil: {$lte: now},
      })
      .sort({lockedUntil: 1})
      .limit(limit)
      .toArray()
    let reaped = 0
    for (const delivery of candidates) {
      const attempt = this.attemptContext(delivery)
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
      const result = await this.finishConcurrentAttemptWithError(
        delivery,
        attempt,
        options,
        serializeExecutionError(
          new Error('The worker lock expired before the attempt completed.'),
          'worker_lost',
        ),
        now,
      )
      if (result) reaped++
    }
    return reaped
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
            status: 'v2-success',
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

      const desiredOptions = requestedOptions
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
    local.document = document
    local.options = optionsFromDocument(document, local.configuredMaxConcurrency)
  }

  private toSubscriptionInfo(local: LocalSubscription): PulseSubscriptionInfo {
    return {
      id: local.document._id,
      topic: local.document.topic,
      consumerGroup: local.document.consumerGroup,
      configVersion: local.options.configVersion,
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
