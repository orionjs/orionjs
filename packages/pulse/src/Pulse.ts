import {AsyncLocalStorage} from 'node:async_hooks'
import {type Db, type Filter, MongoClient, type MongoClientOptions} from 'mongodb'
import {uuidv7} from 'uuidv7'
import {PulseConfigurationError, PulseLockLostError} from './errors'
import {HistoryApi} from './HistoryApi'
import {createCollectionsAndIndexes, type PulseCollections} from './indexes'
import type {
  DeliveryDocument,
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
// Handler slots and coordinator work share a deliberately small pool.
const DEFAULT_MAX_POOL_SIZE = 5
const DEFAULT_LOCK_TIMEOUT_MS = 30_000
const DEFAULT_DISCOVERY_LOCK_TIMEOUT_MS = 10_000
const DISCOVERY_BATCH_SIZE = 100
const RECONCILIATION_BATCH_SIZE = 25
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

interface ClaimedExecution {
  local: LocalSubscription
  delivery: DeliveryDocument
  attempt: HistoryDocument
  orderedLease?: OrderedLease
}

interface DiscoveryResult {
  discovered: boolean
  scanned: boolean
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000)
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
    ordered: options.ordered ?? true,
    offsetReset: options.offsetReset ?? 'latest',
    delivery: options.delivery ?? 'at-least-once',
    maxRetries: options.maxRetries ?? 3,
    retryDelayMs: options.retryDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    maxConcurrency: options.maxConcurrency ?? workerCount,
  }

  assertBoolean(resolved.ordered, 'ordered')
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

function subscriptionConfig(document: SubscriptionDocument) {
  return {
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
    ordered: options.ordered,
    offsetReset: options.offsetReset,
    delivery: options.delivery,
    maxRetries: options.maxRetries,
    retryDelayMs: options.retryDelayMs,
    retryBackoffMultiplier: options.retryBackoffMultiplier,
  }
  return JSON.stringify(subscriptionConfig(document)) === JSON.stringify(expected)
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
  private readonly discoveryRetryAt = new Map<string, number>()
  private localSubscriptionOffset = 0
  private db?: Db
  private collections?: PulseCollections
  private coordinatorPromise?: Promise<void>
  private discoveryRequestRevision = 0
  private handledDiscoveryRequestRevision = 0
  private nextDiscoveryAt = 0
  private running = true
  private closePromise?: Promise<void>

  constructor(options: PulseConnectOptions) {
    this.options = resolveOptions(options)
    this.client = new MongoClient(this.options.connectionString, {
      appName: '@orion-js/pulse',
      maxPoolSize: this.options.maxPoolSize,
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

    const options = resolveSubscribeOptions(userOptions, this.options.workerCount)
    this.subscribingTopics.add(topic)
    try {
      const document = await this.getOrCreateSubscription(topic, options)
      const local: LocalSubscription = {
        document,
        options,
        handler: handler as PulseEventHandler<string, unknown>,
        running: 0,
        unsubscribed: false,
      }
      this.localSubscriptions.set(topic, local)
      this.discoveryRetryAt.delete(topic)
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
          }
          await this.releaseDiscoveryLeaseForTopic(topic)
          this.discoveryRetryAt.delete(topic)
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

    const leaderTopics = this.getDiscoveryLeaderTopics()
    let reaped = 0
    let reconciled = 0
    if (leaderTopics.length > 0) {
      reaped = await this.reapExpiredAttempts(leaderTopics)
      reconciled = await this.reconcileDeliveries(leaderTopics)
    }

    let dispatched = false
    while (this.running && this.activeExecutions.size < this.options.workerCount) {
      const execution = await this.claimExecution(uuidv7())
      if (!execution) break
      this.startExecution(execution)
      dispatched = true
    }
    return discovery.discovered || reaped > 0 || reconciled > 0 || dispatched
  }

  private async discoverEvents(scanEvents: boolean): Promise<DiscoveryResult> {
    let discovered = false
    let scanned = false
    for (const local of this.localSubscriptionsInFairOrder()) {
      if (local.unsubscribed) continue
      const wasLeader = this.discoveryLeases.has(local.document.topic)
      const lease = await this.getOrRenewDiscoveryLease(local)
      if (!lease || (!scanEvents && wasLeader)) continue
      scanned = true
      const subscription = lease.subscription

      try {
        const legacyCursorFilter = subscription.cursorCreatedAt
          ? {
              $or: [
                {createdAt: {$gt: subscription.cursorCreatedAt}},
                {
                  createdAt: subscription.cursorCreatedAt,
                  _id: {$gt: subscription.cursorEventId ?? ''},
                },
              ],
            }
          : {}
        const legacyEvents = await this.getCollections()
          .events.find({
            topic: subscription.topic,
            sequence: {$exists: false},
            ...legacyCursorFilter,
          } as Filter<EventDocument>)
          .sort({createdAt: 1, _id: 1})
          .limit(DISCOVERY_BATCH_SIZE)
          .toArray()

        if (legacyEvents.length > 0) {
          for (const event of legacyEvents) {
            await this.materializeDelivery(subscription, event)
          }
          const lastLegacy = legacyEvents.at(-1)
          if (lastLegacy) {
            await this.advanceDiscoveryCursor(lease, {
              cursorCreatedAt: lastLegacy.createdAt,
              cursorEventId: lastLegacy._id,
            })
            discovered = true
            continue
          }
        }

        const sequenceCursorFilter = subscription.cursorSequence
          ? {
              $or: [
                {sequence: {$gt: subscription.cursorSequence}},
                {
                  sequence: subscription.cursorSequence,
                  _id: {$gt: subscription.cursorSequenceEventId ?? ''},
                },
              ],
            }
          : {}
        const sequencedEvents = await this.getCollections()
          .events.find({
            topic: subscription.topic,
            sequence: {$exists: true},
            ...sequenceCursorFilter,
          } as Filter<EventDocument>)
          .sort({sequence: 1, _id: 1})
          .limit(DISCOVERY_BATCH_SIZE)
          .toArray()

        if (sequencedEvents.length === 0) {
          continue
        }

        for (const event of sequencedEvents) {
          await this.materializeDelivery(subscription, event)
        }

        const lastSequenced = sequencedEvents.at(-1)
        if (!lastSequenced?.sequence) {
          continue
        }
        await this.advanceDiscoveryCursor(lease, {
          cursorSequence: lastSequenced.sequence,
          cursorSequenceEventId: lastSequenced._id,
        })
        discovered = true
      } catch (error) {
        if (error instanceof PulseLockLostError) {
          await this.forgetDiscoveryLease(local.document.topic, lease)
        }
        throw error
      }
    }
    return {discovered, scanned}
  }

  private async materializeDelivery(subscription: SubscriptionDocument, event: EventDocument) {
    let delivery = await this.getCollections().deliveries.findOne({
      consumerGroup: subscription.consumerGroup,
      eventId: event._id,
    })
    if (!delivery) {
      const createdAt = new Date()
      const candidate: DeliveryDocument = {
        _id: uuidv7(),
        eventId: event._id,
        consumerGroup: subscription.consumerGroup,
        topic: event.topic,
        eventCreatedAt: event.createdAt,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
      }
      try {
        await this.getCollections().deliveries.insertOne(candidate)
        delivery = candidate
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error
        delivery = await this.getCollections().deliveries.findOne({
          consumerGroup: subscription.consumerGroup,
          eventId: event._id,
        })
      }
    }
    if (delivery?.status === 'pending') {
      await this.ensureAttempt(delivery, 1, delivery.createdAt)
    }
  }

  private async claimExecution(workerId: string): Promise<ClaimedExecution | undefined> {
    const fairSubscriptions = this.localSubscriptionsInFairOrder()
    for (const local of fairSubscriptions) {
      if (local.unsubscribed || !local.options.ordered || local.running > 0) continue

      const delivery = await this.getCollections().deliveries.findOne(
        {
          consumerGroup: this.options.consumerGroup,
          topic: local.document.topic,
          status: 'pending',
        },
        {sort: {eventCreatedAt: 1, eventId: 1}},
      )
      if (!delivery) continue

      const candidate = await this.findClaimableAttemptForDelivery(delivery)
      if (!candidate) continue

      const lease = await this.acquireOrderedLease(local, workerId)
      if (!lease) continue

      if (this.localSubscriptions.get(local.document.topic) !== local || local.unsubscribed) {
        await this.releaseOrderedLease(lease)
        continue
      }

      let attempt: HistoryDocument | undefined
      try {
        attempt = await this.claimAttempt(candidate, workerId)
      } catch (error) {
        await this.releaseOrderedLease(lease).catch(releaseError => this.reportError(releaseError))
        throw error
      }
      if (!attempt) {
        await this.releaseOrderedLease(lease)
        continue
      }

      local.running++
      return {local, delivery, attempt, orderedLease: lease}
    }

    const concurrent = fairSubscriptions.filter(
      local => !local.unsubscribed && !local.options.ordered,
    )

    for (const local of concurrent) {
      if (local.running >= local.options.maxConcurrency) continue
      const now = new Date()
      const lockToken = uuidv7()
      const attempt = await this.getCollections().history.findOneAndUpdate(
        {
          consumerGroup: this.options.consumerGroup,
          topic: local.document.topic,
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
        {sort: {nextAttemptAt: 1, createdAt: 1}, returnDocument: 'after'},
      )
      if (!attempt) continue

      const delivery = await this.getCollections().deliveries.findOne({_id: attempt.deliveryId})
      const current = this.localSubscriptions.get(attempt.topic)
      if (current !== local || local.unsubscribed || !delivery) {
        await this.releaseUnstartedAttempt(attempt)
        continue
      }
      if (delivery.status !== 'pending') {
        const history = await this.finishAttemptWithError(
          attempt,
          serializeError(
            new Error('The delivery became terminal before this attempt could start.'),
            'delivery_already_terminal',
          ),
        )
        if (history) await this.applyTerminalRetention(delivery)
        continue
      }

      local.running++
      return {local, delivery, attempt}
    }
    return undefined
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
      await this.executeAttempt(
        execution.local,
        execution.delivery,
        execution.attempt,
        execution.orderedLease,
      )
    } catch (error) {
      this.reportError(error)
    } finally {
      execution.local.running--
      if (execution.orderedLease) {
        await this.releaseOrderedLease(execution.orderedLease).catch(error =>
          this.reportError(error),
        )
      }
    }
  }

  private async findClaimableAttemptForDelivery(delivery: DeliveryDocument) {
    const now = new Date()
    const candidate = await this.getCollections().history.findOne(
      {deliveryId: delivery._id, status: 'pending'},
      {sort: {attempt: -1}},
    )
    if (!candidate || candidate.nextAttemptAt.getTime() > now.getTime() || candidate.lockToken) {
      return undefined
    }
    return candidate
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

  private async finishAttemptWithSuccess(attempt: HistoryDocument) {
    const endedAt = new Date()
    const result = await this.getCollections().history.findOneAndUpdate(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $set: {
          status: 'success',
          endedAt,
          durationMs: attempt.startedAt ? endedAt.getTime() - attempt.startedAt.getTime() : 0,
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
    if (!expiresAt) return

    // Histories become expirable before their terminal delivery. If the process dies
    // between these writes, the delivery remains as a durable repair marker.
    await this.getCollections().history.updateMany(
      {deliveryId: delivery._id, status: {$in: ['success', 'error']}},
      {$set: {expiresAt}},
    )
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: delivery.status, expiresAt: {$exists: false}},
      {$set: {expiresAt}},
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
      this.wakeCoordinator()
      return document
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error
      return await this.getCollections().history.findOne({deliveryId: delivery._id, attempt})
    }
  }

  private async reapExpiredAttempts(topics: string[]) {
    if (topics.length === 0) return 0
    let reaped = 0

    for (let inspected = 0; inspected < RECONCILIATION_BATCH_SIZE; inspected++) {
      const now = new Date()
      const candidate = await this.getCollections().history.findOne(
        {
          consumerGroup: this.options.consumerGroup,
          topic: {$in: topics},
          status: 'pending',
          lockedUntil: {$lte: now},
          lockToken: {$exists: true},
        },
        {sort: {lockedUntil: 1}},
      )
      if (!candidate) break

      const endedAt = new Date()
      const history = await this.getCollections().history.findOneAndUpdate(
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
            durationMs: candidate.startedAt ? endedAt.getTime() - candidate.startedAt.getTime() : 0,
          },
          $unset: {expiresAt: ''},
        },
        {returnDocument: 'after'},
      )
      if (!history) continue

      const delivery = await this.getCollections().deliveries.findOne({_id: history.deliveryId})
      if (delivery?.status === 'pending') await this.afterAttemptError(delivery, history)
      reaped++
    }
    return reaped
  }

  private async reconcileDeliveries(topics: string[]) {
    if (topics.length === 0) return 0
    const deliveryFilter: Filter<DeliveryDocument> = {
      consumerGroup: this.options.consumerGroup,
      topic: {$in: topics},
      ...(this.options.historyRetentionMs === null
        ? {status: 'pending'}
        : {
            $or: [
              {status: 'pending'},
              {
                status: {$in: ['success', 'error']},
                expiresAt: {$exists: false},
              },
            ],
          }),
    }
    const deliveries = await this.getCollections()
      .deliveries.find(deliveryFilter)
      .sort({eventCreatedAt: 1, eventId: 1})
      .limit(RECONCILIATION_BATCH_SIZE)
      .toArray()

    let reconciled = 0
    for (const delivery of deliveries) {
      if (delivery.status !== 'pending') {
        await this.applyTerminalRetention(delivery)
        reconciled++
        continue
      }

      const successful = await this.getCollections().history.findOne(
        {deliveryId: delivery._id, status: 'success'},
        {sort: {attempt: 1}},
      )
      if (successful) {
        await this.finishDeliveryWithSuccess(delivery, successful)
        reconciled++
        continue
      }

      const latest = await this.getCollections().history.findOne(
        {deliveryId: delivery._id},
        {sort: {attempt: -1}},
      )
      if (!latest) {
        await this.ensureAttempt(delivery, 1, delivery.createdAt)
        reconciled++
        continue
      }
      if (latest.status === 'error') {
        await this.afterAttemptError(delivery, latest)
        reconciled++
      }
    }
    return reconciled
  }

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

  private async getOrRenewDiscoveryLease(
    local: LocalSubscription,
  ): Promise<DiscoveryLease | undefined> {
    const topic = local.document.topic
    const existing = this.discoveryLeases.get(topic)
    const now = new Date()
    const renewalWindow = Math.max(1, Math.floor(this.options.discoveryLockTimeoutMs / 3))

    if (existing) {
      if (
        local.unsubscribed ||
        this.localSubscriptions.get(topic) !== local ||
        existing.subscription._id !== local.document._id
      ) {
        await this.releaseDiscoveryLeaseForTopic(topic)
        return undefined
      }
      if (existing.lockedUntil.getTime() - now.getTime() > renewalWindow) return existing

      const lockedUntil = new Date(now.getTime() + this.options.discoveryLockTimeoutMs)
      const subscription = await this.getCollections().subscriptions.findOneAndUpdate(
        {_id: existing.subscription._id, discoveryLockToken: existing.lockToken},
        {
          $set: {
            discoveryLockOwner: this.coordinatorId,
            discoveryLockedUntil: lockedUntil,
          },
        },
        {returnDocument: 'after'},
      )
      if (subscription) {
        existing.subscription = subscription
        existing.lockedUntil = lockedUntil
        return existing
      }

      await this.forgetDiscoveryLease(topic, existing)
    }

    if ((this.discoveryRetryAt.get(topic) ?? 0) > now.getTime()) return undefined

    const lockToken = uuidv7()
    const lockedUntil = new Date(now.getTime() + this.options.discoveryLockTimeoutMs)
    const subscription = await this.getCollections().subscriptions.findOneAndUpdate(
      {
        _id: local.document._id,
        $or: [{discoveryLockedUntil: {$exists: false}}, {discoveryLockedUntil: {$lte: now}}],
      },
      {
        $set: {
          discoveryLockOwner: this.coordinatorId,
          discoveryLockToken: lockToken,
          discoveryLockedUntil: lockedUntil,
        },
      },
      {returnDocument: 'after'},
    )
    if (subscription) {
      const lease = {subscription, lockToken, lockedUntil}
      this.discoveryLeases.set(topic, lease)
      this.discoveryRetryAt.delete(topic)
      return lease
    }

    const observed = await this.getCollections().subscriptions.findOne(
      {_id: local.document._id},
      {projection: {discoveryLockedUntil: 1}},
    )
    const maximumRetryDelay = Math.max(
      this.options.pollIntervalMs,
      Math.min(this.options.discoveryLockTimeoutMs / 2, this.options.pollIntervalMs * 5),
    )
    const observedExpiry = observed?.discoveryLockedUntil?.getTime() ?? now.getTime()
    const retryBase = Math.min(observedExpiry, now.getTime() + maximumRetryDelay)
    const jitter = Math.floor(Math.random() * this.options.pollIntervalMs)
    this.discoveryRetryAt.set(
      topic,
      Math.max(now.getTime() + this.options.pollIntervalMs, retryBase) + jitter,
    )
    return undefined
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

  private async forgetDiscoveryLease(topic: string, lease: DiscoveryLease) {
    if (this.discoveryLeases.get(topic) !== lease) return
    this.discoveryLeases.delete(topic)
    this.discoveryRetryAt.set(topic, Date.now() + this.options.pollIntervalMs)
  }

  private getDiscoveryLeaderTopics() {
    return [...this.discoveryLeases.keys()].filter(topic => this.localSubscriptions.has(topic))
  }

  private async advanceDiscoveryCursor(
    lease: DiscoveryLease,
    cursor: Pick<
      SubscriptionDocument,
      'cursorCreatedAt' | 'cursorEventId' | 'cursorSequence' | 'cursorSequenceEventId'
    >,
  ) {
    const lockedUntil = new Date(Date.now() + this.options.discoveryLockTimeoutMs)
    const subscription = await this.getCollections().subscriptions.findOneAndUpdate(
      {_id: lease.subscription._id, discoveryLockToken: lease.lockToken},
      {
        $set: {
          ...cursor,
          updatedAt: new Date(),
          discoveryLockedUntil: lockedUntil,
        },
      },
      {returnDocument: 'after'},
    )
    if (!subscription) {
      throw new PulseLockLostError(
        `Discovery lease was lost for ${lease.subscription.consumerGroup}/${lease.subscription.topic}.`,
      )
    }
    lease.subscription = subscription
    lease.lockedUntil = lockedUntil
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

  private async getOrCreateSubscription(
    topic: string,
    options: ResolvedSubscribeOptions,
  ): Promise<SubscriptionDocument> {
    let document = await this.getCollections().subscriptions.findOne({
      consumerGroup: this.options.consumerGroup,
      topic,
    })
    if (!document) {
      const now = new Date()
      const latest =
        options.offsetReset === 'latest'
          ? await this.getCollections().events.findOne(
              {topic, sequence: {$exists: false}},
              {sort: {createdAt: -1, _id: -1}},
            )
          : undefined
      const latestSequenced =
        options.offsetReset === 'latest'
          ? await this.getCollections().events.findOne(
              {topic, sequence: {$exists: true}},
              {sort: {sequence: -1, _id: -1}},
            )
          : undefined
      const candidate: SubscriptionDocument = {
        _id: uuidv7(),
        consumerGroup: this.options.consumerGroup,
        topic,
        ordered: options.ordered,
        offsetReset: options.offsetReset,
        delivery: options.delivery,
        maxRetries: options.maxRetries,
        retryDelayMs: options.retryDelayMs,
        retryBackoffMultiplier: options.retryBackoffMultiplier,
        createdAt: now,
        updatedAt: now,
        ...(options.offsetReset === 'latest'
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
        await this.getCollections().subscriptions.insertOne(candidate)
        document = candidate
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error
        document = await this.getCollections().subscriptions.findOne({
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
    if (!configsMatch(document, options)) {
      throw new PulseConfigurationError(
        `Subscription configuration for ${this.options.consumerGroup}/${topic} does not match ` +
          `the persisted configuration. Existing=${JSON.stringify(subscriptionConfig(document))}.`,
      )
    }
    return document
  }

  private toSubscriptionInfo(local: LocalSubscription): PulseSubscriptionInfo {
    return {
      id: local.document._id,
      topic: local.document.topic,
      consumerGroup: local.document.consumerGroup,
      ordered: local.options.ordered,
      offsetReset: local.options.offsetReset,
      delivery: local.options.delivery,
      maxRetries: local.options.maxRetries,
      retryDelayMs: local.options.retryDelayMs,
      retryBackoffMultiplier: local.options.retryBackoffMultiplier,
      maxConcurrency: local.options.maxConcurrency,
    }
  }

  private localSubscriptionsInFairOrder() {
    const subscriptions = [...this.localSubscriptions.values()]
    if (subscriptions.length < 2) return subscriptions

    const offset = this.localSubscriptionOffset % subscriptions.length
    this.localSubscriptionOffset = (offset + 1) % subscriptions.length
    return [...subscriptions.slice(offset), ...subscriptions.slice(0, offset)]
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
    await Promise.allSettled(
      [...this.discoveryLeases.keys()].map(topic => this.releaseDiscoveryLeaseForTopic(topic)),
    )
    await Promise.allSettled([...this.activeExecutions])
    await this.client.close()
  }
}

export function connect<TEvents extends PulseEventMap = Record<string, unknown>>(
  options: PulseConnectOptions,
) {
  return new Pulse<TEvents>(options)
}
