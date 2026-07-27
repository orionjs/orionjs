import {
  type ChangeStream,
  type Db,
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
// Four worker loops plus capacity for the Change Stream wake-up cursor.
const DEFAULT_MAX_POOL_SIZE = 5
const DEFAULT_LOCK_TIMEOUT_MS = 30_000
const DISCOVERY_BATCH_SIZE = 100
const RECONCILIATION_BATCH_SIZE = 25

interface ResolvedConnectOptions {
  connectionString: string
  consumerGroup: string
  databaseName?: string
  collectionPrefix: string
  changeStreams: 'auto' | 'required' | 'disabled'
  eventRetentionMs: number | null
  historyRetentionMs: number | null
  pollIntervalMs: number
  workerCount: number
  maxPoolSize: number
  lockTimeoutMs: number
  onError: (error: Error) => void
}

interface OrderedLease {
  subscription: SubscriptionDocument
  lockToken: string
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000)
}

function assertNonEmptyString(value: string, name: string) {
  if (!value || !value.trim()) {
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

function resolveOptions(options: PulseConnectOptions): ResolvedConnectOptions {
  assertNonEmptyString(options.connectionString, 'connectionString')
  assertNonEmptyString(options.consumerGroup, 'consumerGroup')

  const resolved: ResolvedConnectOptions = {
    connectionString: options.connectionString,
    consumerGroup: options.consumerGroup,
    databaseName: options.databaseName,
    collectionPrefix: options.collectionPrefix ?? 'orionjs.pulse',
    changeStreams: options.changeStreams ?? 'auto',
    eventRetentionMs:
      options.eventRetentionMs === undefined ? WEEK_IN_MS : options.eventRetentionMs,
    historyRetentionMs:
      options.historyRetentionMs === undefined ? WEEK_IN_MS : options.historyRetentionMs,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    workerCount: options.workerCount ?? DEFAULT_WORKER_COUNT,
    maxPoolSize: options.maxPoolSize ?? DEFAULT_MAX_POOL_SIZE,
    lockTimeoutMs: options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    onError:
      options.onError ??
      ((error: Error) => {
        console.error('[Pulse]', error)
      }),
  }

  assertNonEmptyString(resolved.collectionPrefix, 'collectionPrefix')
  assertPositiveNumber(resolved.pollIntervalMs, 'pollIntervalMs')
  assertPositiveNumber(resolved.workerCount, 'workerCount')
  assertPositiveInteger(resolved.maxPoolSize, 'maxPoolSize')
  assertPositiveNumber(resolved.lockTimeoutMs, 'lockTimeoutMs')
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
  const resolved: ResolvedSubscribeOptions = {
    ordered: options.ordered ?? true,
    offsetReset: options.offsetReset ?? 'latest',
    delivery: options.delivery ?? 'at-least-once',
    maxRetries: options.maxRetries ?? 3,
    retryDelayMs: options.retryDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    maxConcurrency: options.maxConcurrency ?? workerCount,
  }

  assertPositiveNumber(resolved.maxRetries, 'maxRetries', true)
  assertPositiveNumber(resolved.retryDelayMs, 'retryDelayMs', true)
  assertPositiveNumber(resolved.retryBackoffMultiplier, 'retryBackoffMultiplier')
  assertPositiveNumber(resolved.maxConcurrency, 'maxConcurrency')
  if (resolved.delivery === 'at-most-once' && options.maxRetries && options.maxRetries > 0) {
    throw new PulseConfigurationError(
      'maxRetries must be zero or omitted when delivery is "at-most-once".',
    )
  }
  if (resolved.delivery === 'at-most-once') resolved.maxRetries = 0
  if (resolved.ordered) resolved.maxConcurrency = 1

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

function serializeError(error: unknown, code = 'handler_error'): PulseHistoryError {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    code,
    name: normalized.name,
    message: normalized.message,
    ...(normalized.stack ? {stack: normalized.stack} : {}),
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
  private readonly wakeWaiters = new Set<() => void>()
  private db?: Db
  private collections?: PulseCollections
  private workerPromises: Promise<void>[] = []
  private changeStreamPromise?: Promise<void>
  private changeStream?: ChangeStream
  private running = true
  private closePromise?: Promise<void>
  private changeStreamsEnabled = false

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
    const document: EventDocument<TEvents[TTopic]> = {
      _id: uuidv7(),
      topic: options.topic,
      data: options.data,
      createdAt,
      ...(options.headers ? {headers: options.headers} : {}),
      ...(expiresAt ? {expiresAt} : {}),
    }

    await this.getCollections().events.insertOne(document as EventDocument)
    this.wakeWorkers()

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

    const options = resolveSubscribeOptions(userOptions, this.options.workerCount)
    const document = await this.getOrCreateSubscription(topic, options)
    const local: LocalSubscription = {
      document,
      options,
      handler: handler as PulseEventHandler<string, unknown>,
      running: 0,
      unsubscribed: false,
    }
    this.localSubscriptions.set(topic, local)
    this.wakeWorkers()

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
        this.wakeWorkers()
      },
    }

    return subscription
  }

  getSubscriptions(): PulseSubscriptionInfo[] {
    return [...this.localSubscriptions.values()].map(subscription =>
      this.toSubscriptionInfo(subscription),
    )
  }

  async close() {
    if (this.closePromise) return this.closePromise
    this.closePromise = this.closeInternal()
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
      this.changeStreamsEnabled = await this.resolveChangeStreamsSupport()
      this.startWorkers()
      if (this.changeStreamsEnabled) {
        this.changeStreamPromise = this.runChangeStreamLoop()
      }
    } catch (error) {
      this.running = false
      await this.client.close().catch(() => undefined)
      throw error
    }
  }

  private async resolveChangeStreamsSupport() {
    if (this.options.changeStreams === 'disabled') return false

    const hello = await this.client.db('admin').command({hello: 1})
    const supported = Boolean(hello.setName || hello.msg === 'isdbgrid')
    if (!supported && this.options.changeStreams === 'required') {
      throw new PulseConfigurationError(
        'Change Streams require a MongoDB replica set or sharded cluster.',
      )
    }
    return supported
  }

  private startWorkers() {
    this.workerPromises = Array.from({length: this.options.workerCount}, () =>
      this.runWorker(uuidv7()),
    )
  }

  private async runWorker(workerId: string) {
    while (this.running) {
      try {
        const didWork = await this.workOnce(workerId)
        if (!didWork) await this.waitForWork()
      } catch (error) {
        this.reportError(error)
        await this.waitForWork()
      }
    }
  }

  private async workOnce(workerId: string) {
    if (this.localSubscriptions.size === 0) return false
    if (await this.reapOneExpiredAttempt()) return true
    if (await this.reconcileDeliveries()) return true
    if (await this.acquireAndExecuteOne(workerId)) return true
    return await this.discoverEvents(workerId)
  }

  private async discoverEvents(workerId: string) {
    for (const local of [...this.localSubscriptions.values()]) {
      if (local.unsubscribed) continue
      const token = uuidv7()
      const now = new Date()
      const lockedUntil = new Date(now.getTime() + this.options.lockTimeoutMs)
      const subscription = await this.getCollections().subscriptions.findOneAndUpdate(
        {
          _id: local.document._id,
          $or: [{discoveryLockedUntil: {$exists: false}}, {discoveryLockedUntil: {$lte: now}}],
        },
        {
          $set: {
            discoveryLockOwner: workerId,
            discoveryLockToken: token,
            discoveryLockedUntil: lockedUntil,
          },
        },
        {returnDocument: 'after'},
      )
      if (!subscription) continue

      try {
        const cursorFilter = subscription.cursorCreatedAt
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
        const events = await this.getCollections()
          .events.find({topic: subscription.topic, ...cursorFilter} as Filter<EventDocument>)
          .sort({createdAt: 1, _id: 1})
          .limit(DISCOVERY_BATCH_SIZE)
          .toArray()

        if (events.length === 0) {
          await this.releaseDiscoveryLease(subscription._id, token)
          continue
        }

        for (const event of events) {
          await this.materializeDelivery(subscription, event)
        }

        const last = events.at(-1)
        if (!last) {
          await this.releaseDiscoveryLease(subscription._id, token)
          continue
        }
        const result = await this.getCollections().subscriptions.updateOne(
          {_id: subscription._id, discoveryLockToken: token},
          {
            $set: {
              cursorCreatedAt: last.createdAt,
              cursorEventId: last._id,
              updatedAt: new Date(),
            },
            $unset: {
              discoveryLockOwner: '',
              discoveryLockToken: '',
              discoveryLockedUntil: '',
            },
          },
        )
        if (result.modifiedCount === 0) {
          throw new PulseLockLostError(
            `Discovery lease was lost for ${subscription.consumerGroup}/${subscription.topic}.`,
          )
        }
        return true
      } catch (error) {
        await this.releaseDiscoveryLease(subscription._id, token).catch(() => undefined)
        throw error
      }
    }
    return false
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

  private async acquireAndExecuteOne(workerId: string) {
    for (const local of [...this.localSubscriptions.values()]) {
      if (local.unsubscribed || !local.options.ordered || local.running > 0) continue
      const lease = await this.acquireOrderedLease(local, workerId)
      if (!lease) continue

      const delivery = await this.getCollections().deliveries.findOne(
        {
          consumerGroup: this.options.consumerGroup,
          topic: local.document.topic,
          status: 'pending',
        },
        {sort: {eventCreatedAt: 1, eventId: 1}},
      )
      if (!delivery) {
        await this.releaseOrderedLease(lease)
        continue
      }

      const attempt = await this.claimAttemptForDelivery(delivery, workerId)
      if (!attempt) {
        await this.releaseOrderedLease(lease)
        continue
      }

      local.running++
      try {
        await this.executeAttempt(local, delivery, attempt, lease)
      } finally {
        local.running--
        await this.releaseOrderedLease(lease).catch(error => this.reportError(error))
      }
      return true
    }

    const concurrent = [...this.localSubscriptions.values()].filter(
      local =>
        !local.unsubscribed &&
        !local.options.ordered &&
        local.running < local.options.maxConcurrency,
    )
    if (concurrent.length === 0) return false

    const now = new Date()
    const lockToken = uuidv7()
    const attempt = await this.getCollections().history.findOneAndUpdate(
      {
        consumerGroup: this.options.consumerGroup,
        topic: {$in: concurrent.map(local => local.document.topic)},
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
    if (!attempt) return false

    const local = this.localSubscriptions.get(attempt.topic)
    const delivery = await this.getCollections().deliveries.findOne({_id: attempt.deliveryId})
    if (!local || local.unsubscribed || !delivery) {
      await this.releaseUnstartedAttempt(attempt)
      return false
    }

    local.running++
    try {
      await this.executeAttempt(local, delivery, attempt)
    } finally {
      local.running--
    }
    return true
  }

  private async claimAttemptForDelivery(delivery: DeliveryDocument, workerId: string) {
    const now = new Date()
    const candidate = await this.getCollections().history.findOne(
      {deliveryId: delivery._id, status: 'pending'},
      {sort: {attempt: -1}},
    )
    if (!candidate || candidate.nextAttemptAt.getTime() > now.getTime() || candidate.lockToken) {
      return undefined
    }
    const lockToken = uuidv7()
    return (
      (await this.getCollections().history.findOneAndUpdate(
        {_id: candidate._id, status: 'pending', lockToken: {$exists: false}},
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
      if (heartbeatRunning || lockLost || !this.running) return
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
      await local.handler(received)
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
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    const result = await this.getCollections().history.findOneAndUpdate(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $set: {
          status: 'success',
          endedAt,
          durationMs: attempt.startedAt ? endedAt.getTime() - attempt.startedAt.getTime() : 0,
          ...(expiresAt ? {expiresAt} : {}),
        },
      },
      {returnDocument: 'after'},
    )
    return result ?? undefined
  }

  private async finishAttemptWithError(attempt: HistoryDocument, error: PulseHistoryError) {
    const endedAt = new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    const result = await this.getCollections().history.findOneAndUpdate(
      {_id: attempt._id, status: 'pending', lockToken: attempt.lockToken},
      {
        $set: {
          status: 'error',
          error,
          endedAt,
          durationMs: attempt.startedAt ? endedAt.getTime() - attempt.startedAt.getTime() : 0,
          ...(expiresAt ? {expiresAt} : {}),
        },
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

    const delay =
      subscription.retryDelayMs *
      subscription.retryBackoffMultiplier ** Math.max(0, history.attempt - 1)
    await this.ensureAttempt(delivery, history.attempt + 1, new Date(Date.now() + delay))
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: 'pending'},
      {$set: {updatedAt: new Date()}},
    )
    this.wakeWorkers()
  }

  private async finishDeliveryWithSuccess(delivery: DeliveryDocument, history: HistoryDocument) {
    const endedAt = history.endedAt ?? new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: {$ne: 'success'}},
      {
        $set: {
          status: 'success',
          finalAttempt: history.attempt,
          updatedAt: endedAt,
          endedAt,
          ...(expiresAt ? {expiresAt} : {}),
        },
        $unset: {error: ''},
      },
    )
    this.wakeWorkers()
  }

  private async finishDeliveryWithError(delivery: DeliveryDocument, history: HistoryDocument) {
    const endedAt = history.endedAt ?? new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
    await this.getCollections().deliveries.updateOne(
      {_id: delivery._id, status: 'pending'},
      {
        $set: {
          status: 'error',
          finalAttempt: history.attempt,
          error: history.error,
          updatedAt: endedAt,
          endedAt,
          ...(expiresAt ? {expiresAt} : {}),
        },
      },
    )
    this.wakeWorkers()
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
      this.wakeWorkers()
      return document
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error
      return await this.getCollections().history.findOne({deliveryId: delivery._id, attempt})
    }
  }

  private async reapOneExpiredAttempt() {
    const topics = [...this.localSubscriptions.keys()]
    if (topics.length === 0) return false
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
    if (!candidate) return false

    const endedAt = new Date()
    const expiresAt = getExpiresAt(endedAt, this.options.historyRetentionMs)
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
          ...(expiresAt ? {expiresAt} : {}),
        },
      },
      {returnDocument: 'after'},
    )
    if (!history) return false

    const delivery = await this.getCollections().deliveries.findOne({_id: history.deliveryId})
    if (delivery?.status === 'pending') await this.afterAttemptError(delivery, history)
    return true
  }

  private async reconcileDeliveries() {
    const topics = [...this.localSubscriptions.keys()]
    if (topics.length === 0) return false
    const deliveries = await this.getCollections()
      .deliveries.find({
        consumerGroup: this.options.consumerGroup,
        topic: {$in: topics},
        status: 'pending',
      })
      .sort({eventCreatedAt: 1, eventId: 1})
      .limit(RECONCILIATION_BATCH_SIZE)
      .toArray()

    for (const delivery of deliveries) {
      const successful = await this.getCollections().history.findOne(
        {deliveryId: delivery._id, status: 'success'},
        {sort: {attempt: 1}},
      )
      if (successful) {
        await this.finishDeliveryWithSuccess(delivery, successful)
        return true
      }

      const latest = await this.getCollections().history.findOne(
        {deliveryId: delivery._id},
        {sort: {attempt: -1}},
      )
      if (!latest) {
        await this.ensureAttempt(delivery, 1, delivery.createdAt)
        return true
      }
      if (latest.status === 'error') {
        await this.afterAttemptError(delivery, latest)
        return true
      }
    }
    return false
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

  private async releaseDiscoveryLease(subscriptionId: string, lockToken: string) {
    await this.getCollections().subscriptions.updateOne(
      {_id: subscriptionId, discoveryLockToken: lockToken},
      {
        $unset: {
          discoveryLockOwner: '',
          discoveryLockToken: '',
          discoveryLockedUntil: '',
        },
      },
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
          ? await this.getCollections().events.findOne({topic}, {sort: {createdAt: -1, _id: -1}})
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

  private async runChangeStreamLoop() {
    while (this.running && this.changeStreamsEnabled) {
      try {
        this.changeStream = this.getCollections().events.watch(
          [{$match: {operationType: 'insert'}}],
          {maxAwaitTimeMS: this.options.pollIntervalMs},
        )
        for await (const _change of this.changeStream) {
          if (!this.running) break
          this.wakeWorkers()
        }
      } catch (error) {
        if (this.running) {
          this.reportError(error)
          await sleep(this.options.pollIntervalMs)
        }
      } finally {
        await this.changeStream?.close().catch(() => undefined)
        this.changeStream = undefined
      }
    }
  }

  private waitForWork() {
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
      const timer = setTimeout(finish, this.options.pollIntervalMs)
      timer.unref?.()
      this.wakeWaiters.add(finish)
    })
  }

  private wakeWorkers() {
    for (const wake of [...this.wakeWaiters]) wake()
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
    this.wakeWorkers()
    await this.changeStream?.close().catch(() => undefined)
    await this.readyPromise.catch(() => undefined)
    await Promise.allSettled(this.workerPromises)
    await this.changeStreamPromise?.catch(() => undefined)
    await this.client.close()
  }
}

export function connect<TEvents extends PulseEventMap = Record<string, unknown>>(
  options: PulseConnectOptions,
) {
  return new Pulse<TEvents>(options)
}
