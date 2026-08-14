import {afterAll, afterEach, beforeAll, describe, expect, it, setDefaultTimeout} from 'bun:test'
import {type ChildProcess} from 'node:child_process'
import {
  type Collection,
  type CollectionOptions,
  type Db,
  type Document,
  MongoClient,
  Timestamp,
} from 'mongodb'
import {MongoMemoryServer} from 'mongodb-memory-server'
import {uuidv7} from 'uuidv7'
import {connect, type Pulse, PulseConfigurationError, PulseIndexError} from './index'

setDefaultTimeout(60_000)

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

let standalone: MongoMemoryServer
const pulseClients: Array<Pulse<any>> = []
const mongoClients: MongoClient[] = []
const childProcesses = new Set<ChildProcess>()

type TestDatabase = Omit<Db, 'collection'> & {
  collection<TSchema extends Document = any>(
    name: string,
    options?: CollectionOptions,
  ): Collection<TSchema>
}

function uniqueName(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function getMongoClientOptions(pulse: Pulse<any>) {
  return (
    pulse as unknown as {
      client: {
        options: {maxPoolSize: number; minPoolSize: number; maxIdleTimeMS: number}
      }
    }
  ).client.options
}

function getRuntimeState(pulse: Pulse<any>) {
  return pulse as unknown as {
    coordinatorPromise?: Promise<void>
    activeExecutions: Set<Promise<void>>
    discoveryLeases: Map<string, unknown>
    discoveryRefreshAt: number
    nextReapAt: number
    nextDeliveryCleanupAt: number
    localSubscriptions: Map<string, {running: number}>
    running: boolean
    collections: {
      events: any
      subscriptions: any
      deliveries: any
    }
    wakeCoordinator(): void
    coordinateOnce(): Promise<boolean>
    discoverEvents(scanEvents: boolean): Promise<{discovered: boolean; scanned: boolean}>
    refreshDiscoveryLeases(): Promise<void>
    claimExecutions(capacity: number): Promise<unknown[]>
    materializeDeliveries(events: Document[]): Promise<void>
    runExecution(execution: unknown): Promise<void>
    reapExpiredAttempts(topics: string[]): Promise<number>
    cleanupSuccessfulDeliveries(topics: string[]): Promise<number>
  }
}

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {timeoutMs?: number; intervalMs?: number} = {},
) {
  const timeoutMs = options.timeoutMs ?? 10_000
  const intervalMs = options.intervalMs ?? 20
  const startedAt = Date.now()
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Condition was not met within ${timeoutMs}ms.`)
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
}

function createPulse(
  databaseName: string,
  consumerGroup: string,
  options: Partial<Parameters<typeof connect>[0]> = {},
) {
  const pulse = connect({
    connectionString: standalone.getUri(databaseName),
    databaseName,
    consumerGroup,
    pollIntervalMs: 20,
    workerCount: 4,
    lockTimeoutMs: 300,
    eventRetentionMs: null,
    historyRetentionMs: null,
    onError: () => {},
    ...options,
  })
  pulseClients.push(pulse)
  return pulse
}

async function rawDatabase(databaseName: string) {
  const client = new MongoClient(standalone.getUri(databaseName))
  mongoClients.push(client)
  await client.connect()
  return client.db(databaseName) as TestDatabase
}

beforeAll(async () => {
  standalone = await MongoMemoryServer.create({
    instance: {args: ['--setParameter', 'ttlMonitorSleepSecs=1']},
  })
})

afterEach(async () => {
  for (const child of childProcesses) {
    if (!child.killed) child.kill('SIGKILL')
  }
  childProcesses.clear()
  await Promise.allSettled(pulseClients.splice(0).map(client => client.close()))
  await Promise.allSettled(mongoClients.splice(0).map(client => client.close()))
})

afterAll(async () => {
  await standalone?.stop()
})

describe('Pulse persistence', () => {
  it('uses one expiring MongoDB pool connection by default and supports overrides', async () => {
    const defaultPulse = createPulse(uniqueName('default_pool'), 'default-pool-group')
    const configuredPulse = createPulse(uniqueName('configured_pool'), 'configured-pool-group', {
      maxPoolSize: 12,
      maxIdleTimeMS: 90_000,
    })
    const noIdleExpiryPulse = createPulse(uniqueName('no_idle_expiry'), 'no-idle-expiry-group', {
      maxIdleTimeMS: 0,
    })

    await Promise.all([
      defaultPulse.awaitConnection(),
      configuredPulse.awaitConnection(),
      noIdleExpiryPulse.awaitConnection(),
    ])

    expect(getMongoClientOptions(defaultPulse)).toMatchObject({
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30_000,
    })
    expect(getMongoClientOptions(configuredPulse)).toMatchObject({
      maxPoolSize: 12,
      minPoolSize: 0,
      maxIdleTimeMS: 90_000,
    })
    expect(getMongoClientOptions(noIdleExpiryPulse).maxIdleTimeMS).toBe(0)
  })

  it('uses delivery-resident execution without an ordering option', async () => {
    const databaseName = uniqueName('default_execution')
    const pulse = createPulse(databaseName, 'default-execution-group')
    const subscription = await pulse.subscribe('default-execution.topic', async () => {})

    expect('ordered' in subscription).toBe(false)
    expect(subscription.configVersion).toBe(0)
    expect(subscription.maxConcurrency).toBe(4)

    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').findOne({
        consumerGroup: 'default-execution-group',
        topic: 'default-execution.topic',
      }),
    ).toMatchObject({configVersion: 0})
    expect(
      await db.collection('orionjs.pulse.subscriptions').findOne({
        consumerGroup: 'default-execution-group',
        topic: 'default-execution.topic',
      }),
    ).not.toHaveProperty('ordered')
  })

  it('adopts an existing production subscription while ignoring obsolete fields', async () => {
    const databaseName = uniqueName('obsolete_subscription_fields')
    const consumerGroup = 'obsolete-subscription-fields-group'
    const topic = 'obsolete-subscription-fields.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const now = new Date()
    await db.collection<any>('orionjs.pulse.subscriptions').insertOne({
      _id: uuidv7(),
      consumerGroup,
      topic,
      configVersion: 2,
      ordered: false,
      executionVersion: 2,
      offsetReset: 'latest',
      delivery: 'at-least-once',
      maxRetries: 3,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      createdAt: now,
      updatedAt: now,
      cursorCreatedAt: now,
      cursorEventId: '',
    })

    let calls = 0
    const subscription = await pulse.subscribe(
      topic,
      async () => {
        calls++
      },
      {configVersion: 2},
    )
    expect(subscription.configVersion).toBe(2)
    expect('ordered' in subscription).toBe(false)

    const event = await pulse.publish({topic, data: null})
    await waitFor(() => calls === 1)
    expect(
      await db.collection('orionjs.pulse.deliveries').findOne({eventId: event.id}),
    ).toMatchObject({status: 'v2-success'})
  })

  it('adopts the highest subscription configVersion without downgrading', async () => {
    const databaseName = uniqueName('config_version')
    const consumerGroup = 'config-version-group'
    const topic = 'config-version.topic'
    const first = createPulse(databaseName, consumerGroup)
    const winner = createPulse(databaseName, consumerGroup)
    const stale = createPulse(databaseName, consumerGroup)

    await first.subscribe(topic, async () => {}, {retryDelayMs: 10, configVersion: 1})
    const updated = await winner.subscribe(topic, async () => {}, {
      retryDelayMs: 20,
      configVersion: 2,
    })
    const staleResult = await stale.subscribe(topic, async () => {}, {
      retryDelayMs: 10,
      configVersion: 1,
    })

    expect(updated).toMatchObject({retryDelayMs: 20, configVersion: 2})
    expect(staleResult).toMatchObject({retryDelayMs: 20, configVersion: 2})

    const runtime = getRuntimeState(first)
    runtime.discoveryRefreshAt = 0
    await runtime.refreshDiscoveryLeases()
    expect(first.getSubscriptions()[0]).toMatchObject({retryDelayMs: 20, configVersion: 2})

    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').findOne({consumerGroup, topic}),
    ).toMatchObject({retryDelayMs: 20, configVersion: 2})
  })

  it('rejects different settings at the same configVersion', async () => {
    const databaseName = uniqueName('config_version_conflict')
    const consumerGroup = 'config-version-conflict-group'
    const topic = 'config-version-conflict.topic'
    const first = createPulse(databaseName, consumerGroup)
    const conflicting = createPulse(databaseName, consumerGroup)

    await first.subscribe(topic, async () => {}, {retryDelayMs: 10, configVersion: 2})

    await expect(
      conflicting.subscribe(topic, async () => {}, {retryDelayMs: 20, configVersion: 2}),
    ).rejects.toThrow('Increase configVersion to change it')
  })

  it('does not create or use a physical history collection', async () => {
    const databaseName = uniqueName('no_history_io')
    const consumerGroup = 'no-history-io-group'
    const topic = 'no-history-io.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    let calls = 0
    await pulse.subscribe(
      topic,
      async () => {
        calls++
      },
      {configVersion: 1, offsetReset: 'latest'},
    )
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise
    const db = await rawDatabase(databaseName)
    expect(
      await db.listCollections({name: 'orionjs.pulse.history'}, {nameOnly: true}).hasNext(),
    ).toBe(false)
    const event = await pulse.publish({topic, data: null})
    const eventDocument = await db.collection('orionjs.pulse.events').findOne({_id: event.id})
    if (!eventDocument) throw new Error('Expected the event document.')
    await runtime.materializeDeliveries([eventDocument])
    runtime.running = true
    const [execution] = await runtime.claimExecutions(1)
    if (!execution) throw new Error('Expected the delivery to be claimable.')
    await runtime.runExecution(execution)
    runtime.running = false
    expect(calls).toBe(1)
  })

  it('retries concurrent deliveries without writing the history collection', async () => {
    const databaseName = uniqueName('concurrent_retry')
    const consumerGroup = 'concurrent-retry-group'
    const topic = 'concurrent-retry.topic'
    const pulse = createPulse(databaseName, consumerGroup, {historyRetentionMs: 60_000})
    await pulse.awaitConnection()
    const attempts: number[] = []
    await pulse.subscribe(
      topic,
      async event => {
        attempts.push(event.attempt)
        if (event.attempt === 1) throw new Error('retry once')
      },
      {
        configVersion: 1,
        offsetReset: 'latest',
        retryDelayMs: 0,
        maxRetries: 1,
      },
    )
    const event = await pulse.publish({topic, data: null})
    const db = await rawDatabase(databaseName)

    await waitFor(async () => {
      const delivery = await db
        .collection('orionjs.pulse.deliveries')
        .findOne({consumerGroup, eventId: event.id})
      return delivery?.status === 'v2-success'
    })

    expect(attempts).toEqual([1, 2])
    const delivery = await db
      .collection('orionjs.pulse.deliveries')
      .findOne({consumerGroup, eventId: event.id})
    expect(delivery?.expiresAt).toBeInstanceOf(Date)
    expect(delivery?.attempts.map((attempt: Document) => attempt.status)).toEqual([
      'error',
      'success',
    ])
    const history = await pulse.history.find({eventId: event.id})
    expect(history.records.map(record => record.status).sort()).toEqual(['error', 'success'])
  })

  it('bounds concurrent attempt history independently from the retry count', async () => {
    const databaseName = uniqueName('concurrent_attempt_window')
    const consumerGroup = 'concurrent-attempt-window-group'
    const topic = 'concurrent-attempt-window.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    await pulse.subscribe(
      topic,
      async event => {
        if (event.attempt <= 30) throw new Error('x'.repeat(20_000))
      },
      {
        configVersion: 1,
        offsetReset: 'latest',
        retryDelayMs: 0,
        maxRetries: 30,
      },
    )
    const event = await pulse.publish({topic, data: null})
    const db = await rawDatabase(databaseName)

    await waitFor(
      async () =>
        (
          await db
            .collection('orionjs.pulse.deliveries')
            .findOne({consumerGroup, eventId: event.id})
        )?.status === 'v2-success',
    )
    const delivery = await db
      .collection('orionjs.pulse.deliveries')
      .findOne({consumerGroup, eventId: event.id})
    expect(delivery).toMatchObject({attempt: 31, finalAttempt: 31})
    expect(delivery?.attempts).toHaveLength(10)
    expect(delivery?.attempts[0].attempt).toBe(22)
    expect(delivery?.attempts.at(-1).attempt).toBe(31)
    expect(delivery?.attempts[0].error.message.length).toBeLessThanOrEqual(2_048)
  })

  it('recovers an expired concurrent lock with the delivery fencing token', async () => {
    const databaseName = uniqueName('concurrent_recovery')
    const consumerGroup = 'concurrent-recovery-group'
    const topic = 'concurrent-recovery.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const receivedAttempts: number[] = []
    await pulse.subscribe(
      topic,
      async event => {
        receivedAttempts.push(event.attempt)
      },
      {
        configVersion: 1,
        offsetReset: 'latest',
        retryDelayMs: 0,
        maxRetries: 1,
      },
    )
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const db = await rawDatabase(databaseName)
    const event = await pulse.publish({topic, data: null})
    const eventDocument = await db.collection('orionjs.pulse.events').findOne({_id: event.id})
    if (!eventDocument) throw new Error('Expected the event document.')
    await runtime.materializeDeliveries([eventDocument])
    runtime.running = true
    const [abandoned] = await runtime.claimExecutions(1)
    expect(abandoned).toBeDefined()
    runtime.running = false

    await db
      .collection('orionjs.pulse.deliveries')
      .updateOne(
        {consumerGroup, eventId: event.id, status: 'v2-processing'},
        {$set: {lockedUntil: new Date(Date.now() - 1)}},
      )
    runtime.nextReapAt = 0
    expect(await runtime.reapExpiredAttempts([topic])).toBe(1)

    const recovered = await db
      .collection('orionjs.pulse.deliveries')
      .findOne({consumerGroup, eventId: event.id})
    expect(recovered).toMatchObject({status: 'v2-pending', attempt: 1})
    expect(recovered?.attempts).toHaveLength(1)
    expect(recovered?.attempts[0].error.code).toBe('worker_lost')

    runtime.running = true
    const [retry] = await runtime.claimExecutions(1)
    if (!retry) throw new Error('Expected the recovered delivery to be claimable.')
    await runtime.runExecution(retry)
    runtime.running = false

    expect(receivedAttempts).toEqual([2])
    expect(
      await db.collection('orionjs.pulse.deliveries').findOne({consumerGroup, eventId: event.id}),
    ).toMatchObject({status: 'v2-success', finalAttempt: 2})
  })

  it('rejects invalid MongoDB pool sizes before connecting', () => {
    for (const maxPoolSize of [0, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() =>
        connect({
          connectionString: 'mongodb://localhost/pulse',
          consumerGroup: 'invalid-pool-group',
          maxPoolSize,
        }),
      ).toThrow(PulseConfigurationError)
    }
    for (const maxIdleTimeMS of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        connect({
          connectionString: 'mongodb://localhost/pulse',
          consumerGroup: 'invalid-idle-time-group',
          maxIdleTimeMS,
        }),
      ).toThrow(PulseConfigurationError)
    }
  })

  it('creates, validates, and recreates all indexes during connection', async () => {
    const databaseName = uniqueName('indexes')
    const first = createPulse(databaseName, 'index-group')
    const second = createPulse(databaseName, 'index-group')
    await Promise.all([first.awaitConnection(), second.awaitConnection()])

    const db = await rawDatabase(databaseName)
    const expected = {
      'orionjs.pulse.events': [
        {
          name: 'pulse_events_topic_created_id',
          key: {topic: 1, createdAt: 1, _id: 1},
        },
        {
          name: 'pulse_events_topic_sequence_id',
          key: {topic: 1, sequence: 1, _id: 1},
        },
        {
          name: 'pulse_events_legacy_topic_created_id',
          key: {topic: 1, sequence: 1, createdAt: 1, _id: 1},
        },
        {
          name: 'pulse_events_expires_at_ttl',
          key: {expiresAt: 1},
          expireAfterSeconds: 0,
        },
      ],
      'orionjs.pulse.subscriptions': [
        {
          name: 'pulse_subscriptions_group_topic_unique',
          key: {consumerGroup: 1, topic: 1},
          unique: true,
        },
        {
          name: 'pulse_subscriptions_discovery_lease',
          key: {consumerGroup: 1, discoveryLockedUntil: 1},
        },
      ],
      'orionjs.pulse.deliveries': [
        {
          name: 'pulse_deliveries_group_event_unique',
          key: {consumerGroup: 1, eventId: 1},
          unique: true,
        },
        {
          name: 'pulse_deliveries_acquisition',
          key: {consumerGroup: 1, topic: 1, status: 1, eventCreatedAt: 1, eventId: 1},
        },
        {
          name: 'pulse_deliveries_sequence_acquisition',
          key: {consumerGroup: 1, topic: 1, status: 1, eventSequence: 1, eventId: 1},
        },
        {
          name: 'pulse_deliveries_concurrent_pending',
          key: {consumerGroup: 1, nextAttemptAt: 1, createdAt: 1, topic: 1},
          partialFilterExpression: {status: 'v2-pending'},
        },
        {
          name: 'pulse_deliveries_concurrent_processing',
          key: {consumerGroup: 1, lockedUntil: 1, topic: 1},
          partialFilterExpression: {status: 'v2-processing'},
        },
        {
          name: 'pulse_deliveries_expires_at_ttl',
          key: {expiresAt: 1},
          expireAfterSeconds: 0,
        },
      ],
    }

    for (const [collectionName, expectedIndexes] of Object.entries(expected)) {
      const indexes = await db.collection(collectionName).listIndexes().toArray()
      for (const expectedIndex of expectedIndexes) {
        const index = indexes.find(item => item.name === expectedIndex.name)
        expect(index?.key).toEqual(expectedIndex.key)
        expect(Boolean(index?.unique)).toBe(
          Boolean('unique' in expectedIndex && expectedIndex.unique),
        )
        expect(index?.expireAfterSeconds).toBe(
          'expireAfterSeconds' in expectedIndex ? expectedIndex.expireAfterSeconds : undefined,
        )
        expect(index?.partialFilterExpression).toEqual(
          'partialFilterExpression' in expectedIndex
            ? expectedIndex.partialFilterExpression
            : undefined,
        )
      }
    }

    await db.collection('orionjs.pulse.events').dropIndex('pulse_events_topic_sequence_id')
    const reconnect = createPulse(databaseName, 'index-group')
    await reconnect.awaitConnection()
    const recreatedEvents = await db.collection('orionjs.pulse.events').listIndexes().toArray()
    expect(recreatedEvents.some(index => index.name === 'pulse_events_topic_sequence_id')).toBe(
      true,
    )
  })

  it('fails readiness when a named Pulse index is incompatible', async () => {
    const databaseName = uniqueName('bad_index')
    const db = await rawDatabase(databaseName)
    await db.createCollection('orionjs.pulse.events')
    await db
      .collection('orionjs.pulse.events')
      .createIndex({wrongField: 1}, {name: 'pulse_events_topic_created_id'})

    const pulse = createPulse(databaseName, 'bad-index-group')
    await expect(pulse.awaitConnection()).rejects.toBeInstanceOf(PulseIndexError)
  })

  it('accepts the previous names for concurrent queue indexes during a hot update', async () => {
    const databaseName = uniqueName('concurrent_index_aliases')
    const db = await rawDatabase(databaseName)
    const deliveries = db.collection('orionjs.pulse.deliveries')
    await deliveries.createIndexes([
      {
        name: 'pulse_deliveries_v2_pending',
        key: {consumerGroup: 1, nextAttemptAt: 1, createdAt: 1, topic: 1},
        partialFilterExpression: {status: 'v2-pending'},
      },
      {
        name: 'pulse_deliveries_v2_processing',
        key: {consumerGroup: 1, lockedUntil: 1, topic: 1},
        partialFilterExpression: {status: 'v2-processing'},
      },
    ])

    const pulse = createPulse(databaseName, 'concurrent-index-aliases-group')
    await pulse.awaitConnection()

    const indexes = await deliveries.listIndexes().toArray()
    expect(indexes.some(index => index.name === 'pulse_deliveries_v2_pending')).toBe(true)
    expect(indexes.some(index => index.name === 'pulse_deliveries_v2_processing')).toBe(true)
    expect(indexes.some(index => index.name === 'pulse_deliveries_concurrent_pending')).toBe(false)
    expect(indexes.some(index => index.name === 'pulse_deliveries_concurrent_processing')).toBe(
      false,
    )
  })

  it('uses indexed, non-blocking sorts for every hot polling branch', async () => {
    const databaseName = uniqueName('poll_explain')
    const consumerGroup = 'poll-explain-group'
    const topic = 'poll-explain.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const now = new Date()

    await db.collection<any>('orionjs.pulse.events').insertMany([
      {
        _id: uuidv7(),
        topic,
        data: {sequenced: true},
        createdAt: now,
        sequence: new Timestamp({t: 1, i: 1}),
      },
      {_id: uuidv7(), topic, data: {legacy: true}, createdAt: now},
    ])
    await db.collection<any>('orionjs.pulse.deliveries').insertMany([
      {
        _id: uuidv7(),
        eventId: uuidv7(),
        consumerGroup,
        topic,
        eventCreatedAt: now,
        status: 'v2-pending',
        attempt: 0,
        attemptId: uuidv7(),
        attemptCreatedAt: now,
        nextAttemptAt: now,
        attempts: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: uuidv7(),
        eventId: uuidv7(),
        consumerGroup,
        topic,
        eventCreatedAt: now,
        status: 'v2-processing',
        attempt: 1,
        attemptId: uuidv7(),
        attemptCreatedAt: now,
        nextAttemptAt: now,
        lockedUntil: now,
        attempts: [],
        createdAt: now,
        updatedAt: now,
      },
    ])

    const legacyExplain = await db
      .collection('orionjs.pulse.events')
      .find({topic, sequence: {$exists: false}, createdAt: {$gte: now}})
      .sort({createdAt: 1, _id: 1})
      .limit(100)
      .explain('executionStats')
    const sequencedExplain = await db
      .collection('orionjs.pulse.events')
      .find({topic, sequence: {$gt: new Timestamp({t: 0, i: 0})}})
      .sort({sequence: 1, _id: 1})
      .limit(100)
      .explain('executionStats')
    const pendingExplain = await db
      .collection('orionjs.pulse.deliveries')
      .find({
        consumerGroup,
        topic: {$in: [topic]},
        status: 'v2-pending',
        nextAttemptAt: {$lte: now},
      })
      .sort({nextAttemptAt: 1, createdAt: 1})
      .limit(4)
      .explain('executionStats')
    const processingExplain = await db
      .collection('orionjs.pulse.deliveries')
      .find({
        consumerGroup,
        topic: {$in: [topic]},
        status: 'v2-processing',
        lockedUntil: {$lte: now},
      })
      .sort({lockedUntil: 1})
      .limit(25)
      .explain('executionStats')

    const assertions: Array<[unknown, string]> = [
      [legacyExplain, 'pulse_events_legacy_topic_created_id'],
      [sequencedExplain, 'pulse_events_topic_sequence_id'],
      [pendingExplain, 'pulse_deliveries_concurrent_pending'],
      [processingExplain, 'pulse_deliveries_concurrent_processing'],
    ]
    for (const [explain, expectedIndex] of assertions) {
      const winningPlan = JSON.stringify((explain as any).queryPlanner.winningPlan)
      expect(winningPlan).toContain(expectedIndex)
      expect(winningPlan).not.toContain('COLLSCAN')
      expect(winningPlan).not.toContain('"stage":"SORT"')
    }
  })
  it('keeps maintenance queries out of repeated coordinator work iterations', async () => {
    const databaseName = uniqueName('maintenance_schedule')
    const topic = 'maintenance-schedule.topic'
    const pulse = createPulse(databaseName, 'maintenance-schedule-group')
    await pulse.awaitConnection()
    await pulse.subscribe(topic, async () => {}, {offsetReset: 'latest'})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    let reapCalls = 0
    let cleanupCalls = 0
    runtime.reapExpiredAttempts = async () => {
      reapCalls++
      runtime.nextReapAt = Date.now() + 60_000
      return 0
    }
    runtime.cleanupSuccessfulDeliveries = async () => {
      cleanupCalls++
      runtime.nextDeliveryCleanupAt = Date.now() + 60_000
      return 0
    }
    runtime.nextReapAt = 0
    runtime.nextDeliveryCleanupAt = 0

    await runtime.coordinateOnce()
    await Promise.all(Array.from({length: 10}, () => runtime.coordinateOnce()))

    expect(reapCalls).toBe(1)
    expect(cleanupCalls).toBe(1)
  })

  it('cleans retained successes only after their persisted sequenced or legacy cursor', async () => {
    const databaseName = uniqueName('delivery_cleanup_cursors')
    const consumerGroup = 'delivery-cleanup-cursors-group'
    const topic = 'delivery-cleanup-cursors.topic'
    const pulse = createPulse(databaseName, consumerGroup, {historyRetentionMs: 60_000})
    await pulse.awaitConnection()
    await pulse.subscribe(topic, async () => {}, {offsetReset: 'latest'})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const db = await rawDatabase(databaseName)
    const now = new Date()
    const cursorCreatedAt = new Date(now.getTime() - 1_000)
    const cursorSequence = new Timestamp({t: 20, i: 2})
    const [
      lowerSequenceEventId,
      lowerLegacyEventId,
      cursorEventId,
      higherSequenceEventId,
      higherLegacyEventId,
    ] = Array.from({length: 5}, () => uuidv7()).sort()
    await db.collection('orionjs.pulse.subscriptions').updateOne(
      {consumerGroup, topic},
      {
        $set: {
          cursorCreatedAt,
          cursorEventId,
          cursorSequence,
          cursorSequenceEventId: cursorEventId,
          discoveryLockedUntil: new Date(Date.now() + 60_000),
        },
      },
    )

    const retainedUntil = new Date(Date.now() + 60_000)
    const delivery = (
      eventId: string,
      options: {
        status?: 'success' | 'v2-pending' | 'v2-success' | 'v2-error'
        eventCreatedAt?: Date
        eventSequence?: Timestamp
        expiresAt?: Date
      } = {},
    ) => ({
      _id: uuidv7(),
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: options.eventCreatedAt ?? cursorCreatedAt,
      ...(options.eventSequence ? {eventSequence: options.eventSequence} : {}),
      status: options.status ?? ('v2-success' as const),
      createdAt: now,
      updatedAt: now,
      ...(options.expiresAt ? {expiresAt: options.expiresAt} : {}),
    })
    const deletedEventIds = [uuidv7(), lowerSequenceEventId, uuidv7(), lowerLegacyEventId]
    const keptEventIds = [
      higherSequenceEventId,
      uuidv7(),
      higherLegacyEventId,
      uuidv7(),
      uuidv7(),
      uuidv7(),
      uuidv7(),
      uuidv7(),
    ]
    await db.collection<any>('orionjs.pulse.deliveries').insertMany([
      delivery(deletedEventIds[0], {
        eventSequence: new Timestamp({t: 20, i: 1}),
        expiresAt: retainedUntil,
      }),
      delivery(deletedEventIds[1], {eventSequence: cursorSequence, expiresAt: retainedUntil}),
      delivery(keptEventIds[0], {eventSequence: cursorSequence, expiresAt: retainedUntil}),
      delivery(keptEventIds[1], {
        eventSequence: new Timestamp({t: 20, i: 3}),
        expiresAt: retainedUntil,
      }),
      delivery(deletedEventIds[2], {
        eventCreatedAt: new Date(cursorCreatedAt.getTime() - 1),
        expiresAt: retainedUntil,
      }),
      delivery(deletedEventIds[3], {expiresAt: retainedUntil}),
      delivery(keptEventIds[2], {expiresAt: retainedUntil}),
      delivery(keptEventIds[3], {
        eventCreatedAt: new Date(cursorCreatedAt.getTime() + 1),
        expiresAt: retainedUntil,
      }),
      delivery(keptEventIds[4], {
        eventCreatedAt: new Date(cursorCreatedAt.getTime() - 1),
      }),
      delivery(keptEventIds[5], {
        status: 'v2-pending',
        eventCreatedAt: new Date(cursorCreatedAt.getTime() - 1),
        expiresAt: retainedUntil,
      }),
      delivery(keptEventIds[6], {
        status: 'v2-error',
        eventCreatedAt: new Date(cursorCreatedAt.getTime() - 1),
        expiresAt: retainedUntil,
      }),
      delivery(keptEventIds[7], {
        status: 'success',
        eventCreatedAt: new Date(cursorCreatedAt.getTime() - 1),
        expiresAt: retainedUntil,
      }),
    ])

    const originalDeliveryFind = runtime.collections.deliveries.find
    const originalDeliveryDeleteMany = runtime.collections.deliveries.deleteMany
    let cleanupFilter: Document | undefined
    let cleanupDeleteFilter: Document | undefined
    runtime.collections.deliveries.find = (...args: any[]) => {
      cleanupFilter = args[0]
      return originalDeliveryFind.apply(runtime.collections.deliveries, args)
    }
    runtime.collections.deliveries.deleteMany = (...args: any[]) => {
      cleanupDeleteFilter = args[0]
      return originalDeliveryDeleteMany.apply(runtime.collections.deliveries, args)
    }
    try {
      expect(await runtime.cleanupSuccessfulDeliveries([topic])).toBe(4)
    } finally {
      runtime.collections.deliveries.find = originalDeliveryFind
      runtime.collections.deliveries.deleteMany = originalDeliveryDeleteMany
    }
    if (!cleanupFilter) throw new Error('Delivery cleanup did not issue its candidate query.')
    expect(cleanupFilter.topic).toBe(topic)
    expect(cleanupFilter.$or.every((branch: Document) => branch.topic === undefined)).toBe(true)
    expect(Object.keys(cleanupDeleteFilter ?? {})).toEqual(['_id'])
    expect(cleanupDeleteFilter?._id.$in).toHaveLength(4)
    const cleanupExplain = await db
      .collection('orionjs.pulse.deliveries')
      .find(cleanupFilter)
      .limit(1_000)
      .explain('executionStats')
    const cleanupPlan = JSON.stringify(cleanupExplain.queryPlanner.winningPlan)
    expect(cleanupPlan).toContain('pulse_deliveries_acquisition')
    expect(cleanupPlan).toContain('pulse_deliveries_sequence_acquisition')
    expect(cleanupPlan).not.toContain('COLLSCAN')

    const remaining = await db
      .collection('orionjs.pulse.deliveries')
      .find({}, {projection: {eventId: 1}})
      .toArray()
    expect(remaining.map(item => item.eventId).sort()).toEqual(keptEventIds.sort())
  })

  it('batches cleanup without expiresAt only on the persisted discovery leader', async () => {
    const databaseName = uniqueName('delivery_cleanup_leader')
    const consumerGroup = 'delivery-cleanup-leader-group'
    const topic = 'delivery-cleanup-leader.topic'
    const replicas = [
      createPulse(databaseName, consumerGroup),
      createPulse(databaseName, consumerGroup),
    ]
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    await Promise.all(
      replicas.map(replica => replica.subscribe(topic, async () => {}, {offsetReset: 'latest'})),
    )
    const runtimes = replicas.map(getRuntimeState)
    await waitFor(() => runtimes.filter(runtime => runtime.discoveryLeases.has(topic)).length === 1)
    const leader = runtimes.find(runtime => runtime.discoveryLeases.has(topic))
    const follower = runtimes.find(runtime => !runtime.discoveryLeases.has(topic))
    if (!leader || !follower) throw new Error('Expected one discovery leader and one follower.')
    for (const runtime of runtimes) {
      runtime.running = false
      runtime.wakeCoordinator()
    }
    await Promise.all(runtimes.map(runtime => runtime.coordinatorPromise))

    const db = await rawDatabase(databaseName)
    const cursorCreatedAt = new Date()
    await db.collection('orionjs.pulse.subscriptions').updateOne(
      {consumerGroup, topic},
      {
        $set: {
          cursorCreatedAt,
          cursorEventId: '',
          discoveryLockedUntil: new Date(Date.now() + 60_000),
        },
      },
    )
    const createdAt = new Date(cursorCreatedAt.getTime() - 1)
    await db.collection<any>('orionjs.pulse.deliveries').insertMany(
      Array.from({length: 1_005}, () => ({
        _id: uuidv7(),
        eventId: uuidv7(),
        consumerGroup,
        topic,
        eventCreatedAt: createdAt,
        status: 'v2-success',
        createdAt,
        updatedAt: createdAt,
      })),
    )

    expect(await follower.cleanupSuccessfulDeliveries([topic])).toBe(0)
    expect(await db.collection('orionjs.pulse.deliveries').countDocuments()).toBe(1_005)
    expect(await leader.cleanupSuccessfulDeliveries([topic])).toBe(1_000)
    expect(await db.collection('orionjs.pulse.deliveries').countDocuments()).toBe(5)
    expect(await leader.cleanupSuccessfulDeliveries([topic])).toBe(5)
    expect(await db.collection('orionjs.pulse.deliveries').countDocuments()).toBe(0)
  })

  it('rejects named indexes whose semantic options weaken or alter uniqueness', async () => {
    const cases = [
      {label: 'sparse', options: {sparse: true}},
      {
        label: 'partial',
        options: {partialFilterExpression: {topic: {$exists: true}}},
      },
      {
        label: 'collation',
        options: {collation: {locale: 'en', strength: 2}},
      },
    ]

    for (const testCase of cases) {
      const databaseName = uniqueName(`semantic_index_${testCase.label}`)
      const db = await rawDatabase(databaseName)
      await db.createCollection('orionjs.pulse.subscriptions')
      await db.collection('orionjs.pulse.subscriptions').createIndex(
        {consumerGroup: 1, topic: 1},
        {
          name: 'pulse_subscriptions_group_topic_unique',
          unique: true,
          ...testCase.options,
        },
      )

      const pulse = createPulse(databaseName, `semantic-index-${testCase.label}`)
      let error: unknown
      try {
        await pulse.awaitConnection()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(PulseIndexError)
      expect((error as Error).message).toContain(testCase.label)
    }
  })

  it('persists its consumer group and locks the delivery before the callback', async () => {
    const databaseName = uniqueName('delivery_first')
    const pulse = createPulse(databaseName, 'delivery-group')
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)

    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    let entered!: () => void
    const callbackEntered = new Promise<void>(resolve => {
      entered = resolve
    })
    let receivedPublisher: string | undefined

    await pulse.subscribe(
      'delivery.topic',
      async received => {
        receivedPublisher = received.publisher
        entered()
        await gate
      },
      {offsetReset: 'latest'},
    )
    const event = await pulse.publish({topic: 'delivery.topic', data: {value: 1}})
    await callbackEntered

    expect(event.publisher).toBe('delivery-group')
    expect(receivedPublisher).toBe('delivery-group')
    const storedEvent = await db.collection<any>('orionjs.pulse.events').findOne({_id: event.id})
    expect(storedEvent?.publisher).toBe('delivery-group')

    const pending = await db
      .collection<any>('orionjs.pulse.deliveries')
      .findOne({eventId: event.id})
    expect(pending?.status).toBe('v2-processing')
    expect(pending?.lockToken).toMatch(uuidV7Pattern)
    expect(pending?.lockOwner).toMatch(uuidV7Pattern)
    expect(pending?.lockedUntil.getTime()).toBeGreaterThan(Date.now())
    const activeHistory = await pulse.history.find({
      eventId: event.id,
      lockState: 'active',
    })
    expect(activeHistory.records).toHaveLength(1)
    expect(activeHistory.records[0].status).toBe('pending')

    release()
    await waitFor(async () => {
      const record = await db.collection('orionjs.pulse.deliveries').findOne({eventId: event.id})
      return record?.status === 'v2-success'
    })

    for (const collectionName of [
      'orionjs.pulse.events',
      'orionjs.pulse.subscriptions',
      'orionjs.pulse.deliveries',
    ]) {
      const documents = await db.collection(collectionName).find().toArray()
      expect(documents.length).toBeGreaterThan(0)
      expect(documents.every(document => uuidV7Pattern.test(String(document._id)))).toBe(true)
    }
    expect(
      await db.listCollections({name: 'orionjs.pulse.history'}, {nameOnly: true}).hasNext(),
    ).toBe(false)
  })

  it('expires dated documents and keeps documents without expiresAt', async () => {
    const expiringDatabase = uniqueName('ttl_expiring')
    const expiring = createPulse(expiringDatabase, 'ttl-group', {eventRetentionMs: 100})
    await expiring.awaitConnection()
    const expiringDb = await rawDatabase(expiringDatabase)
    const event = await expiring.publish({topic: 'ttl.topic', data: null})

    await waitFor(
      async () =>
        (await expiringDb
          .collection<any>('orionjs.pulse.events')
          .countDocuments({_id: event.id})) === 0,
      {timeoutMs: 8000, intervalMs: 100},
    )

    const permanentDatabase = uniqueName('ttl_permanent')
    const permanent = createPulse(permanentDatabase, 'permanent-group', {eventRetentionMs: null})
    await permanent.awaitConnection()
    const permanentDb = await rawDatabase(permanentDatabase)
    const permanentEvent = await permanent.publish({topic: 'ttl.topic', data: null})
    await new Promise(resolve => setTimeout(resolve, 1500))
    const permanentDocument = await permanentDb
      .collection<any>('orionjs.pulse.events')
      .findOne({_id: permanentEvent.id})
    expect(permanentDocument).not.toBeNull()
    expect(permanentDocument?.expiresAt).toBeUndefined()
  })
})

describe('Pulse delivery semantics', () => {
  it('rejects the removed Change Streams option before connecting', () => {
    for (const changeStreams of ['auto', 'required', 'disabled']) {
      expect(() =>
        connect({
          connectionString: 'mongodb://localhost/pulse',
          consumerGroup: 'removed-change-streams-group',
          changeStreams,
        } as any),
      ).toThrow('changeStreams is no longer supported')
    }
  })

  it('elects one discovery reader per consumer group across topics and replicas', async () => {
    const databaseName = uniqueName('single_reader')
    const consumerGroup = 'single-reader-group'
    const topics = ['single-reader.a', 'single-reader.b', 'single-reader.c']
    const replicas = Array.from({length: 8}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 4,
        pollIntervalMs: 120,
        lockTimeoutMs: 300,
        discoveryLockTimeoutMs: 60,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    const subscriptions = await Promise.all(
      replicas.map(replica =>
        Promise.all(
          topics.map(topic =>
            replica.subscribe(topic, async () => {}, {
              offsetReset: 'latest',
              maxConcurrency: 4,
            }),
          ),
        ),
      ),
    )
    const states = replicas.map(getRuntimeState)

    await waitFor(
      () =>
        states.reduce((total, state) => total + state.discoveryLeases.size, 0) === topics.length,
    )

    const db = await rawDatabase(databaseName)
    const initialLease = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic: topics[0],
    })
    const initialToken = initialLease?.discoveryLockToken
    expect(initialToken).toMatch(uuidV7Pattern)

    await new Promise(resolve => setTimeout(resolve, 140))
    const renewedLease = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic: topics[0],
    })
    expect(renewedLease?.discoveryLockToken).toBe(initialToken)
    expect(renewedLease?.discoveryLockedUntil.getTime()).toBeGreaterThan(Date.now())

    const leaderIndex = states.findIndex(state => state.discoveryLeases.has(topics[0]))
    expect(leaderIndex).toBeGreaterThanOrEqual(0)
    await subscriptions[leaderIndex][0].unsubscribe()

    await waitFor(
      () =>
        states.reduce((total, state) => total + state.discoveryLeases.size, 0) === topics.length &&
        !states[leaderIndex].discoveryLeases.has(topics[0]),
    )
    const replacementLease = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic: topics[0],
    })
    expect(replacementLease?.discoveryLockToken).toMatch(uuidV7Pattern)
    expect(replacementLease?.discoveryLockToken).not.toBe(initialToken)
  })

  it('keeps discovery leadership after a transient query error', async () => {
    const databaseName = uniqueName('transient_discovery_error')
    const errors: Error[] = []
    const pulse = createPulse(databaseName, 'transient-discovery-group', {
      pollIntervalMs: 30,
      discoveryLockTimeoutMs: 300,
      onError: error => errors.push(error),
    })
    await pulse.awaitConnection()

    let deliveries = 0
    await pulse.subscribe('transient-discovery.topic', async () => {
      deliveries++
    })

    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has('transient-discovery.topic'))
    const db = await rawDatabase(databaseName)
    const before = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup: 'transient-discovery-group',
      topic: 'transient-discovery.topic',
    })

    const originalAggregate = runtime.collections.events.aggregate.bind(runtime.collections.events)
    let failNextAggregate = true
    runtime.collections.events.aggregate = (...args: any[]) => {
      if (failNextAggregate) {
        failNextAggregate = false
        throw new Error('synthetic transient discovery error')
      }
      return originalAggregate(...args)
    }

    await pulse.publish({topic: 'transient-discovery.topic', data: null})
    await waitFor(() => errors.some(error => error.message.includes('synthetic transient')))

    expect(runtime.discoveryLeases.has('transient-discovery.topic')).toBe(true)
    const after = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup: 'transient-discovery-group',
      topic: 'transient-discovery.topic',
    })
    expect(after?.discoveryLockToken).toBe(before?.discoveryLockToken)
    await waitFor(() => deliveries === 1)
  })

  it('coexists with an active old-version per-topic discovery lease during a rolling deploy', async () => {
    const databaseName = uniqueName('mixed_version_discovery')
    const consumerGroup = 'mixed-version-discovery-group'
    const topic = 'mixed-version-discovery.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      pollIntervalMs: 20,
      discoveryLockTimeoutMs: 180,
    })
    await pulse.awaitConnection()
    let deliveries = 0
    await pulse.subscribe(topic, async () => {
      deliveries++
    })
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))

    const db = await rawDatabase(databaseName)
    const oldToken = uuidv7()
    const oldLockedUntil = new Date(Date.now() + 260)
    await db.collection('orionjs.pulse.subscriptions').updateOne(
      {consumerGroup, topic},
      {
        $set: {
          discoveryLockOwner: 'old-version-reader',
          discoveryLockToken: oldToken,
          discoveryLockedUntil: oldLockedUntil,
        },
      },
    )
    await waitFor(() => !runtime.discoveryLeases.has(topic))

    const event = await pulse.publish({topic, data: {rolling: true}})
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(deliveries).toBe(0)
    const whileOldLeaseIsActive = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    expect(whileOldLeaseIsActive?.discoveryLockToken).toBe(oldToken)

    await waitFor(() => deliveries === 1)
    const afterFailover = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    expect(afterFailover?.discoveryLockToken).not.toBe(oldToken)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({eventId: event.id}),
    ).toBe(1)
  })

  it('uses one discovery query for all local topics', async () => {
    const databaseName = uniqueName('aggregate_poll')
    const pulse = createPulse(databaseName, 'aggregate-poll-group', {
      pollIntervalMs: 30,
      discoveryLockTimeoutMs: 30_000,
    })
    await pulse.awaitConnection()

    const topics = ['aggregate.a', 'aggregate.b', 'aggregate.c', 'aggregate.d']
    await Promise.all([
      pulse.subscribe(topics[0], async () => {}, {}),
      pulse.subscribe(topics[1], async () => {}, {}),
      pulse.subscribe(topics[2], async () => {}, {}),
      pulse.subscribe(topics[3], async () => {}, {}),
    ])

    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.size === topics.length)
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const originalEventsAggregate = runtime.collections.events.aggregate.bind(
      runtime.collections.events,
    )
    let discoveryPolls = 0
    let discoveryPipeline: unknown
    runtime.collections.events.aggregate = (...args: any[]) => {
      discoveryPolls++
      discoveryPipeline = args[0]
      return originalEventsAggregate(...args)
    }

    expect(await runtime.discoverEvents(true)).toEqual({discovered: false, scanned: true})
    expect(discoveryPolls).toBe(1)
    const serializedPipeline = JSON.stringify(discoveryPipeline)
    for (const topic of topics) expect(serializedPipeline).toContain(topic)
  })

  it('materializes a full discovery batch with bounded bulk commands', async () => {
    const databaseName = uniqueName('bulk_materialization')
    const consumerGroup = 'bulk-materialization-group'
    const topic = 'bulk-materialization.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      pollIntervalMs: 20,
      discoveryLockTimeoutMs: 1_000,
    })
    await pulse.awaitConnection()
    await pulse.subscribe(topic, async () => {}, {})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise
    await Promise.all(
      Array.from({length: 100}, (_, index) => pulse.publish({topic, data: {index}})),
    )

    let deliveryBulkWrites = 0
    const originalDeliveryBulkWrite = runtime.collections.deliveries.bulkWrite.bind(
      runtime.collections.deliveries,
    )
    runtime.collections.deliveries.bulkWrite = (...args: any[]) => {
      deliveryBulkWrites++
      return originalDeliveryBulkWrite(...args)
    }
    await runtime.discoverEvents(true)
    expect(deliveryBulkWrites).toBe(4)
    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({consumerGroup, topic}),
    ).toBe(100)
  })

  it('delivers once per consumer group while replicas compete through polling', async () => {
    const databaseName = uniqueName('groups')
    const replicaA = createPulse(databaseName, 'group-a')
    const replicaB = createPulse(databaseName, 'group-a')
    const otherGroup = createPulse(databaseName, 'group-b')
    await Promise.all([
      replicaA.awaitConnection(),
      replicaB.awaitConnection(),
      otherGroup.awaitConnection(),
    ])

    let groupACount = 0
    let groupBCount = 0
    const options = {offsetReset: 'latest' as const}
    await replicaA.subscribe(
      'groups.topic',
      async () => {
        groupACount++
      },
      options,
    )
    await replicaB.subscribe(
      'groups.topic',
      async () => {
        groupACount++
      },
      options,
    )
    await otherGroup.subscribe(
      'groups.topic',
      async () => {
        groupBCount++
      },
      options,
    )

    await replicaA.publish({topic: 'groups.topic', data: {value: 1}})
    await waitFor(() => groupACount === 1 && groupBCount === 1)
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(groupACount).toBe(1)
    expect(groupBCount).toBe(1)
  })

  it('processes multiple deliveries concurrently', async () => {
    const databaseName = uniqueName('concurrent')
    const pulse = createPulse(databaseName, 'concurrent-group')
    await pulse.awaitConnection()
    let active = 0
    let maximumActive = 0
    let completed = 0

    await pulse.subscribe(
      'concurrent.topic',
      async () => {
        active++
        maximumActive = Math.max(maximumActive, active)
        await new Promise(resolve => setTimeout(resolve, 100))
        active--
        completed++
      },
      {maxConcurrency: 4, offsetReset: 'latest'},
    )
    await Promise.all(
      Array.from({length: 4}, (_, index) =>
        pulse.publish({topic: 'concurrent.topic', data: {index}}),
      ),
    )
    await waitFor(() => completed === 4)
    expect(getMongoClientOptions(pulse).maxPoolSize).toBe(1)
    expect(maximumActive).toBeGreaterThan(1)
  })

  it('does not retry an at-most-once handler error', async () => {
    const databaseName = uniqueName('at_most_once')
    const pulse = createPulse(databaseName, 'at-most-once-group')
    await pulse.awaitConnection()
    const attempts: number[] = []

    await pulse.subscribe(
      'at-most.topic',
      async event => {
        attempts.push(event.attempt)
        throw new Error('do not retry')
      },
      {delivery: 'at-most-once', offsetReset: 'latest'},
    )
    const event = await pulse.publish({topic: 'at-most.topic', data: null})

    await waitFor(async () => {
      const history = await pulse.history.find({eventId: event.id})
      return history.records[0]?.status === 'error'
    })
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(attempts).toEqual([1])
  })

  it('resumes a persisted latest offset after unsubscribe', async () => {
    const databaseName = uniqueName('offsets')
    const pulse = createPulse(databaseName, 'offset-group')
    await pulse.awaitConnection()
    await pulse.publish({topic: 'offset.topic', data: {label: 'old'}})
    const received: string[] = []
    const options = {offsetReset: 'latest' as const}
    const firstSubscription = await pulse.subscribe(
      'offset.topic',
      async event => {
        received.push((event.data as {label: string}).label)
      },
      options,
    )
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(received).toEqual([])

    await pulse.publish({topic: 'offset.topic', data: {label: 'new-1'}})
    await waitFor(() => received.includes('new-1'))
    await firstSubscription.unsubscribe()
    await pulse.publish({topic: 'offset.topic', data: {label: 'new-2'}})
    await pulse.subscribe(
      'offset.topic',
      async event => {
        received.push((event.data as {label: string}).label)
      },
      options,
    )
    await waitFor(() => received.includes('new-2'))
    expect(received).toEqual(['new-1', 'new-2'])
  })

  it('rejects invalid runtime configuration before starting work', async () => {
    const invalidConnectOptions: Array<Partial<Parameters<typeof connect>[0]>> = [
      {workerCount: 1.5},
      {databaseName: '   '},
      {onError: 'not-a-function' as any},
      {discoveryLockTimeoutMs: 0},
    ]

    for (const options of invalidConnectOptions) {
      expect(() =>
        createPulse(uniqueName('invalid_runtime'), 'invalid-runtime-group', options),
      ).toThrow(PulseConfigurationError)
    }

    const pulse = createPulse(uniqueName('invalid_subscription'), 'invalid-subscription-group')
    await pulse.awaitConnection()
    const invalidSubscriptionOptions: Array<Parameters<typeof pulse.subscribe>[2]> = [
      {maxRetries: 1.5},
      {maxConcurrency: 1.5},
      {maxConcurrency: 0},
      {configVersion: -1},
      {configVersion: 1.5},
      {offsetReset: 'middle' as any},
      {delivery: 'maybe' as any},
      {retryDelayMs: Number.MAX_VALUE},
      {
        maxRetries: 3,
        retryDelayMs: 2,
        retryBackoffMultiplier: Number.MAX_VALUE,
      },
    ]

    for (const [index, options] of invalidSubscriptionOptions.entries()) {
      await expect(
        pulse.subscribe(`invalid.topic.${index}`, async () => {}, options),
      ).rejects.toBeInstanceOf(PulseConfigurationError)
    }
  })

  it('allows only one concurrent local subscribe call for a topic', async () => {
    const databaseName = uniqueName('local_subscribe_race')
    const pulse = createPulse(databaseName, 'local-subscribe-race-group')
    await pulse.awaitConnection()

    const results = await Promise.allSettled([
      pulse.subscribe('local-race.topic', async () => {}, {offsetReset: 'latest'}),
      pulse.subscribe('local-race.topic', async () => {}, {offsetReset: 'latest'}),
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected')
    expect(rejected?.status).toBe('rejected')
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(PulseConfigurationError)
    }

    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').countDocuments({
        consumerGroup: 'local-subscribe-race-group',
        topic: 'local-race.topic',
      }),
    ).toBe(1)
  })

  it('enforces maxConcurrency atomically across local workers', async () => {
    const databaseName = uniqueName('max_concurrency_race')
    const pulse = createPulse(databaseName, 'max-concurrency-race-group', {
      workerCount: 8,
      lockTimeoutMs: 500,
    })
    await pulse.awaitConnection()

    let active = 0
    let maximumActive = 0
    let completed = 0
    await pulse.subscribe(
      'max-concurrency.topic',
      async () => {
        active++
        maximumActive = Math.max(maximumActive, active)
        await new Promise(resolve => setTimeout(resolve, 60))
        active--
        completed++
      },
      {
        offsetReset: 'latest',
        maxConcurrency: 1,
      },
    )

    await Promise.all(
      Array.from({length: 8}, (_, index) =>
        pulse.publish({topic: 'max-concurrency.topic', data: {index}}),
      ),
    )
    await waitFor(() => completed === 8)

    expect(maximumActive).toBe(1)
  })

  it('heartbeats a long handler so another replica cannot reap it', async () => {
    const databaseName = uniqueName('long_heartbeat')
    const consumerGroup = 'long-heartbeat-group'
    const replicaA = createPulse(databaseName, consumerGroup, {
      workerCount: 2,
      lockTimeoutMs: 90,
    })
    const replicaB = createPulse(databaseName, consumerGroup, {
      workerCount: 2,
      lockTimeoutMs: 90,
    })
    await Promise.all([replicaA.awaitConnection(), replicaB.awaitConnection()])
    expect(getMongoClientOptions(replicaA).maxPoolSize).toBe(1)
    expect(getMongoClientOptions(replicaB).maxPoolSize).toBe(1)

    let calls = 0
    const handler = async () => {
      calls++
      await new Promise(resolve => setTimeout(resolve, 320))
    }
    const options = {
      offsetReset: 'latest' as const,
      maxRetries: 2,
      retryDelayMs: 10,
    }
    await Promise.all([
      replicaA.subscribe('heartbeat.topic', handler, options),
      replicaB.subscribe('heartbeat.topic', handler, options),
    ])

    const event = await replicaA.publish({topic: 'heartbeat.topic', data: null})
    await waitFor(async () => {
      const history = await replicaA.history.find({eventId: event.id})
      return history.records[0]?.status === 'success'
    })
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(calls).toBe(1)
    const history = await replicaA.history.find({eventId: event.id})
    expect(history.records).toHaveLength(1)
    expect(history.records[0].status).toBe('success')
  })

  it('keeps heartbeating an active handler during graceful close', async () => {
    const databaseName = uniqueName('graceful_close')
    const consumerGroup = 'graceful-close-group'
    const replicaA = createPulse(databaseName, consumerGroup, {
      workerCount: 1,
      lockTimeoutMs: 90,
    })
    const replicaB = createPulse(databaseName, consumerGroup, {
      workerCount: 1,
      lockTimeoutMs: 90,
    })
    await Promise.all([replicaA.awaitConnection(), replicaB.awaitConnection()])

    let releaseHandler!: () => void
    const handlerGate = new Promise<void>(resolve => {
      releaseHandler = resolve
    })
    let handlerEntered!: () => void
    const entered = new Promise<void>(resolve => {
      handlerEntered = resolve
    })
    let recoveryCalls = 0

    await replicaA.subscribe(
      'graceful-close.topic',
      async () => {
        handlerEntered()
        await handlerGate
      },
      {offsetReset: 'latest', maxRetries: 2, retryDelayMs: 10},
    )
    const event = await replicaA.publish({topic: 'graceful-close.topic', data: null})
    await entered

    await replicaB.subscribe(
      'graceful-close.topic',
      async () => {
        recoveryCalls++
      },
      {offsetReset: 'latest', maxRetries: 2, retryDelayMs: 10},
    )

    const closing = replicaA.close()
    await new Promise(resolve => setTimeout(resolve, 320))
    const callsBeforeRelease = recoveryCalls
    releaseHandler()
    await closing

    expect(callsBeforeRelease).toBe(0)
    await waitFor(async () => {
      const history = await replicaB.history.find({eventId: event.id})
      return history.records[0]?.status === 'success'
    })
    const history = await replicaB.history.find({eventId: event.id})
    expect(history.records).toHaveLength(1)
    expect(recoveryCalls).toBe(0)
  })

  it('does not deadlock when a handler initiates and awaits graceful close', async () => {
    const databaseName = uniqueName('close_inside_handler')
    const consumerGroup = 'close-inside-handler-group'
    const topic = 'close-inside-handler.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      workerCount: 2,
      lockTimeoutMs: 200,
    })
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    let handlerReturned = false

    await pulse.subscribe(
      topic,
      async () => {
        await pulse.close()
        handlerReturned = true
      },
      {offsetReset: 'latest'},
    )
    const event = await pulse.publish({topic, data: null})

    await waitFor(() => handlerReturned, {timeoutMs: 2000})
    await pulse.close()
    const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
      consumerGroup,
      eventId: event.id,
    })
    expect(delivery?.status).toBe('v2-success')
  })

  it('handles many concurrent close calls while active leases finish and a restart drains backlog', async () => {
    const databaseName = uniqueName('concurrent_close_restart')
    const consumerGroup = 'concurrent-close-restart-group'
    const topic = 'concurrent-close-restart.topic'
    const first = createPulse(databaseName, consumerGroup, {
      workerCount: 4,
      lockTimeoutMs: 120,
    })
    await first.awaitConnection()
    const db = await rawDatabase(databaseName)
    const callCounts = new Map<string, number>()
    let active = 0
    let maximumActive = 0
    let releaseHandlers!: () => void
    const handlerGate = new Promise<void>(resolve => {
      releaseHandlers = resolve
    })

    await first.subscribe(
      topic,
      async event => {
        callCounts.set(event.id, (callCounts.get(event.id) ?? 0) + 1)
        active++
        maximumActive = Math.max(maximumActive, active)
        await handlerGate
        active--
      },
      {
        offsetReset: 'latest',
        maxConcurrency: 4,
      },
    )
    const events = await Promise.all(
      Array.from({length: 50}, (_, index) => first.publish({topic, data: {index}})),
    )
    await waitFor(() => active === 4)

    let resolvedCloses = 0
    const closing = Array.from({length: 20}, () =>
      first.close().then(() => {
        resolvedCloses++
      }),
    )
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(resolvedCloses).toBe(0)
    expect(active).toBe(4)
    releaseHandlers()
    await Promise.all(closing)
    expect(maximumActive).toBe(4)

    const second = createPulse(databaseName, consumerGroup, {
      workerCount: 4,
      lockTimeoutMs: 120,
    })
    await second.awaitConnection()
    await second.subscribe(
      topic,
      async event => {
        callCounts.set(event.id, (callCounts.get(event.id) ?? 0) + 1)
      },
      {
        offsetReset: 'latest',
        maxConcurrency: 4,
      },
    )
    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.deliveries').countDocuments({
          consumerGroup,
          topic,
          status: 'v2-success',
        })) === events.length,
      {timeoutMs: 20_000},
    )

    expect(callCounts.size).toBe(events.length)
    expect([...callCounts.values()].every(count => count === 1)).toBe(true)
  })

  it('serializes hostile thrown values without stranding their locks', async () => {
    const databaseName = uniqueName('hostile_error')
    const consumerGroup = 'hostile-error-group'
    const topic = 'hostile-error.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)

    await pulse.subscribe(
      topic,
      async () => {
        throw {
          toString() {
            throw new Error('hostile toString')
          },
        }
      },
      {offsetReset: 'latest', delivery: 'at-most-once'},
    )
    const event = await pulse.publish({topic, data: null})

    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
        consumerGroup,
        eventId: event.id,
      })
      return delivery?.status === 'v2-error'
    })
    const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
      consumerGroup,
      eventId: event.id,
    })

    expect(delivery?.error.code).toBe('handler_error')
    expect(delivery?.error.message).toBe('Handler threw an unreadable value.')
    expect(delivery?.attempts[0].lockToken).toMatch(uuidV7Pattern)
    expect(delivery?.attempts[0].status).toBe('error')
  })

  it('keeps failed attempt evidence until a delayed retry becomes terminal', async () => {
    const databaseName = uniqueName('retention_retry_gap')
    const consumerGroup = 'retention-retry-gap-group'
    const topic = 'retention-retry-gap.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      historyRetentionMs: 500,
      workerCount: 2,
    })
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    let calls = 0

    await pulse.subscribe(
      topic,
      async () => {
        calls++
        if (calls === 1) throw new Error('first attempt fails')
      },
      {
        offsetReset: 'latest',
        maxRetries: 1,
        retryDelayMs: 4000,
      },
    )
    const event = await pulse.publish({topic, data: null})

    await waitFor(async () => {
      const delivery = await db.collection<any>('orionjs.pulse.deliveries').findOne({
        eventId: event.id,
        status: 'v2-pending',
        attempt: 1,
      })
      return delivery?.attempts?.length === 1
    })
    await new Promise(resolve => setTimeout(resolve, 1600))

    const waitingDelivery = await db
      .collection<any>('orionjs.pulse.deliveries')
      .findOne({eventId: event.id})
    expect(waitingDelivery?.attempts.map((attempt: any) => attempt.attempt)).toEqual([1])
    expect(waitingDelivery?.expiresAt).toBeUndefined()

    await db
      .collection('orionjs.pulse.deliveries')
      .updateOne({eventId: event.id, status: 'v2-pending'}, {$set: {nextAttemptAt: new Date()}})
    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
        consumerGroup,
        eventId: event.id,
      })
      return delivery?.status === 'v2-success'
    })

    const terminalDelivery = await db
      .collection<any>('orionjs.pulse.deliveries')
      .findOne({eventId: event.id})
    expect(terminalDelivery?.attempts.map((attempt: any) => attempt.attempt)).toEqual([1, 2])
    expect(terminalDelivery?.expiresAt).toBeInstanceOf(Date)

    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.deliveries').countDocuments({eventId: event.id})) === 0,
      {timeoutMs: 8000, intervalMs: 100},
    )
  })

  it('resumes the exact delayed attempt after every consumer is restarted', async () => {
    const databaseName = uniqueName('cold_restart_retry')
    const consumerGroup = 'cold-restart-retry-group'
    const topic = 'cold-restart-retry.topic'
    const first = createPulse(databaseName, consumerGroup, {
      workerCount: 2,
      historyRetentionMs: 1000,
    })
    await first.awaitConnection()
    const db = await rawDatabase(databaseName)
    let firstCalls = 0

    await first.subscribe(
      topic,
      async () => {
        firstCalls++
        throw new Error('restart before retry')
      },
      {
        offsetReset: 'latest',
        maxRetries: 2,
        retryDelayMs: 500,
      },
    )
    const event = await first.publish({topic, data: null})
    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.deliveries').countDocuments({
          eventId: event.id,
          attempt: 1,
          status: 'v2-pending',
        })) === 1,
    )
    await first.close()
    await new Promise(resolve => setTimeout(resolve, 1200))

    const second = createPulse(databaseName, consumerGroup, {
      workerCount: 2,
      historyRetentionMs: 1000,
    })
    await second.awaitConnection()
    const resumedAttempts: number[] = []
    await second.subscribe(
      topic,
      async received => {
        resumedAttempts.push(received.attempt)
      },
      {
        offsetReset: 'latest',
        maxRetries: 2,
        retryDelayMs: 500,
      },
    )

    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
        consumerGroup,
        eventId: event.id,
      })
      return delivery?.status === 'v2-success'
    })
    const delivery = await db
      .collection<any>('orionjs.pulse.deliveries')
      .findOne({eventId: event.id})

    expect(firstCalls).toBe(1)
    expect(resumedAttempts).toEqual([2])
    expect(delivery?.attempts.map((attempt: any) => attempt.attempt)).toEqual([1, 2])
  })

  it('fans one event out to many consumer groups without cross-group lock leakage', async () => {
    const databaseName = uniqueName('many_groups')
    const topic = 'many-groups.topic'
    const groupCount = 24
    const replicas = Array.from({length: groupCount}, (_, index) =>
      createPulse(databaseName, `many-groups-${index}`, {
        workerCount: 1,
        maxPoolSize: 2,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))

    const calls = new Map<string, number>()
    await Promise.all(
      replicas.map((replica, index) => {
        const group = `many-groups-${index}`
        return replica.subscribe(
          topic,
          async () => {
            calls.set(group, (calls.get(group) ?? 0) + 1)
          },
          {offsetReset: 'latest', maxConcurrency: 1},
        )
      }),
    )
    const event = await replicas[0].publish({topic, data: null})

    await waitFor(() => calls.size === groupCount, {timeoutMs: 20_000})
    await new Promise(resolve => setTimeout(resolve, 200))
    const db = await rawDatabase(databaseName)

    expect([...calls.values()].every(count => count === 1)).toBe(true)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({eventId: event.id}),
    ).toBe(groupCount)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        eventId: event.id,
        status: 'v2-success',
      }),
    ).toBe(groupCount)
  })

  it('rejects split-brain subscription configuration without disturbing the winner', async () => {
    const databaseName = uniqueName('configuration_split_brain')
    const consumerGroup = 'configuration-split-brain-group'
    const topic = 'configuration-split-brain.topic'
    const winner = createPulse(databaseName, consumerGroup)
    const incompatible = createPulse(databaseName, consumerGroup)
    await Promise.all([winner.awaitConnection(), incompatible.awaitConnection()])
    let calls = 0

    await winner.subscribe(
      topic,
      async () => {
        calls++
      },
      {
        offsetReset: 'latest',
        maxRetries: 4,
        retryDelayMs: 25,
      },
    )
    await expect(
      incompatible.subscribe(topic, async () => {}, {
        offsetReset: 'latest',
        maxRetries: 5,
        retryDelayMs: 25,
      }),
    ).rejects.toBeInstanceOf(PulseConfigurationError)
    expect(incompatible.getSubscriptions()).toHaveLength(0)

    await winner.publish({topic, data: null})
    await waitFor(() => calls === 1)
    expect(winner.getSubscriptions()).toHaveLength(1)
  })

  it('does not starve a healthy topic behind an infinite failing backlog', async () => {
    const databaseName = uniqueName('topic_fairness')
    const pulse = createPulse(databaseName, 'topic-fairness-group', {
      workerCount: 4,
    })
    await pulse.awaitConnection()
    let poisonCalls = 0
    let healthyCalls = 0

    const poisonSubscription = await pulse.subscribe(
      'a-poison.topic',
      async () => {
        poisonCalls++
        await new Promise(resolve => setTimeout(resolve, 2))
        throw new Error('keep retrying')
      },
      {
        offsetReset: 'latest',
        maxRetries: 10_000,
        retryDelayMs: 0,
        maxConcurrency: 4,
      },
    )
    await pulse.subscribe(
      'z-healthy.topic',
      async () => {
        healthyCalls++
      },
      {offsetReset: 'latest', maxConcurrency: 1},
    )

    await Promise.all(
      Array.from({length: 60}, (_, index) =>
        pulse.publish({topic: 'a-poison.topic', data: {index}}),
      ),
    )
    await pulse.publish({topic: 'z-healthy.topic', data: null})

    await waitFor(() => healthyCalls === 1, {timeoutMs: 3000})
    expect(poisonCalls).toBeGreaterThan(0)
    await poisonSubscription.unsubscribe()
  })

  it('marks a delivery terminal when its immutable event disappeared', async () => {
    const databaseName = uniqueName('missing_event')
    const consumerGroup = 'missing-event-group'
    const topic = 'missing-event.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    const eventId = uuidv7()
    const deliveryId = uuidv7()

    await db.collection('orionjs.pulse.deliveries').insertOne({
      _id: deliveryId,
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: createdAt,
      status: 'v2-pending',
      attempt: 0,
      attemptId: uuidv7(),
      attemptCreatedAt: createdAt,
      nextAttemptAt: createdAt,
      attempts: [],
      createdAt,
      updatedAt: createdAt,
    })

    let calls = 0
    await pulse.subscribe(
      topic,
      async () => {
        calls++
      },
      {offsetReset: 'earliest', maxRetries: 5},
    )

    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
      return delivery?.status === 'v2-error'
    })
    const delivery = await db.collection<any>('orionjs.pulse.deliveries').findOne({_id: deliveryId})

    expect(calls).toBe(0)
    expect(delivery?.attempts).toHaveLength(1)
    expect(delivery?.attempts[0].error.code).toBe('event_expired')
    expect(delivery?.error.code).toBe('event_expired')
  })

  it('enforces every logical unique index', async () => {
    const databaseName = uniqueName('unique_enforcement')
    const pulse = createPulse(databaseName, 'unique-enforcement-group')
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()

    await db.collection('orionjs.pulse.subscriptions').insertOne({
      _id: uuidv7(),
      consumerGroup: 'duplicate-group',
      topic: 'duplicate.topic',
      offsetReset: 'latest',
      delivery: 'at-least-once',
      maxRetries: 3,
      retryDelayMs: 10,
      retryBackoffMultiplier: 2,
      createdAt,
      updatedAt: createdAt,
    })
    await expect(
      db.collection('orionjs.pulse.subscriptions').insertOne({
        _id: uuidv7(),
        consumerGroup: 'duplicate-group',
        topic: 'duplicate.topic',
      }),
    ).rejects.toMatchObject({code: 11000})

    await db.collection('orionjs.pulse.deliveries').insertOne({
      _id: uuidv7(),
      eventId: 'duplicate-event',
      consumerGroup: 'duplicate-group',
      topic: 'duplicate.topic',
      eventCreatedAt: createdAt,
      status: 'v2-pending',
      createdAt,
      updatedAt: createdAt,
    })
    await expect(
      db.collection('orionjs.pulse.deliveries').insertOne({
        _id: uuidv7(),
        eventId: 'duplicate-event',
        consumerGroup: 'duplicate-group',
      }),
    ).rejects.toMatchObject({code: 11000})
  })

  it('fails startup with an actionable error when duplicate data poisons a unique index', async () => {
    const databaseName = uniqueName('poisoned_unique')
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    await db.collection('orionjs.pulse.subscriptions').insertMany([
      {
        _id: uuidv7(),
        consumerGroup: 'poisoned-group',
        topic: 'poisoned.topic',
        createdAt,
      },
      {
        _id: uuidv7(),
        consumerGroup: 'poisoned-group',
        topic: 'poisoned.topic',
        createdAt,
      },
    ])

    const pulse = createPulse(databaseName, 'poisoned-group')
    let error: unknown
    try {
      await pulse.awaitConnection()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(PulseIndexError)
    expect((error as Error).message).toContain('orionjs.pulse.subscriptions')
    expect((error as Error).message).toContain('pulse_subscriptions_group_topic_unique')
    expect((error as Error).message.toLowerCase()).toContain('duplicate')
  })

  it('bootstraps one durable subscription under a simultaneous replica stampede', async () => {
    const databaseName = uniqueName('replica_stampede')
    const replicas = Array.from({length: 12}, () =>
      createPulse(databaseName, 'stampede-group', {workerCount: 1}),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe('stampede.topic', async () => {}, {
          offsetReset: 'latest',
          maxConcurrency: 1,
        }),
      ),
    )

    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').countDocuments({
        consumerGroup: 'stampede-group',
        topic: 'stampede.topic',
      }),
    ).toBe(1)
  })

  it('delivers a concurrent burst exactly once across competing replicas', async () => {
    const databaseName = uniqueName('burst')
    const consumerGroup = 'burst-group'
    const replicas = Array.from({length: 5}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 4,
        lockTimeoutMs: 500,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))

    const calls = new Map<string, number>()
    const handler = async (event: {id: string}) => {
      calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe('burst.topic', handler as any, {
          offsetReset: 'latest',
          maxConcurrency: 3,
        }),
      ),
    )

    const events = await Promise.all(
      Array.from({length: 100}, (_, index) =>
        replicas[0].publish({topic: 'burst.topic', data: {index}}),
      ),
    )
    const db = await rawDatabase(databaseName)
    try {
      await waitFor(() => calls.size === events.length, {timeoutMs: 20_000})
    } catch (error) {
      const deliveryStatuses = await db
        .collection('orionjs.pulse.deliveries')
        .aggregate([{$group: {_id: '$status', count: {$sum: 1}}}])
        .toArray()
      throw new Error(
        `Burst stalled with ${calls.size}/${events.length} callbacks. ` +
          `Deliveries=${JSON.stringify(deliveryStatuses)}.`,
        {cause: error},
      )
    }
    await new Promise(resolve => setTimeout(resolve, 250))

    expect([...calls.values()].every(count => count === 1)).toBe(true)
    const storedEvents = await db
      .collection('orionjs.pulse.events')
      .find({topic: 'burst.topic'})
      .project({sequence: 1})
      .toArray()
    expect(storedEvents.every(event => event.sequence instanceof Timestamp)).toBe(true)
    expect(new Set(storedEvents.map(event => event.sequence.toString())).size).toBe(100)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        topic: 'burst.topic',
        status: 'v2-success',
      }),
    ).toBe(100)
  })

  it('cannot starve the last topic behind more than one discovery batch in the first topic', async () => {
    const databaseName = uniqueName('discovery_topic_fairness')
    const consumerGroup = 'discovery-topic-fairness-group'
    const db = await rawDatabase(databaseName)
    const firstTopic = 'aaa.backlog'
    const lastTopic = 'zzz.single'
    const createdAt = new Date()
    await db.collection<any>('orionjs.pulse.events').insertMany([
      ...Array.from({length: 180}, (_, index) => ({
        _id: uuidv7(),
        topic: firstTopic,
        data: {index},
        createdAt: new Date(createdAt.getTime() + index),
      })),
      {
        _id: uuidv7(),
        topic: lastTopic,
        data: {index: 0},
        createdAt,
      },
    ])

    const pulse = createPulse(databaseName, consumerGroup, {workerCount: 8})
    await pulse.awaitConnection()
    let firstReceived = 0
    let firstCountWhenLastArrived = Number.POSITIVE_INFINITY
    await Promise.all([
      pulse.subscribe(
        firstTopic,
        async () => {
          firstReceived++
        },
        {offsetReset: 'earliest', maxConcurrency: 8},
      ),
      pulse.subscribe(
        lastTopic,
        async () => {
          firstCountWhenLastArrived = firstReceived
        },
        {offsetReset: 'earliest', maxConcurrency: 8},
      ),
    ])

    await waitFor(() => Number.isFinite(firstCountWhenLastArrived))
    expect(firstCountWhenLastArrived).toBeLessThanOrEqual(180)
    await waitFor(() => firstReceived === 180)
  })

  it('discovers topics owned by replicas with disjoint local subscription sets', async () => {
    const databaseName = uniqueName('disjoint_topic_sets')
    const consumerGroup = 'disjoint-topic-sets-group'
    const first = createPulse(databaseName, consumerGroup, {discoveryLockTimeoutMs: 200})
    const second = createPulse(databaseName, consumerGroup, {discoveryLockTimeoutMs: 200})
    await Promise.all([first.awaitConnection(), second.awaitConnection()])

    const received = new Set<string>()
    await Promise.all([
      first.subscribe('disjoint.first', async event => void received.add(event.id), {}),
      second.subscribe('disjoint.second', async event => void received.add(event.id), {}),
    ])
    await waitFor(
      () =>
        getRuntimeState(first).discoveryLeases.has('disjoint.first') &&
        getRuntimeState(second).discoveryLeases.has('disjoint.second'),
    )

    const events = await Promise.all([
      first.publish({topic: 'disjoint.first', data: {replica: 1}}),
      first.publish({topic: 'disjoint.second', data: {replica: 2}}),
    ])
    await waitFor(() => received.size === events.length)
    expect(events.every(event => received.has(event.id))).toBe(true)
  })

  it('drains mixed legacy and sequenced backlogs larger than the aggregate batch', async () => {
    const databaseName = uniqueName('mixed_discovery_backlog')
    const consumerGroup = 'mixed-discovery-backlog-group'
    const topic = 'mixed-discovery.topic'
    const pulse = createPulse(databaseName, consumerGroup, {workerCount: 8})
    await pulse.awaitConnection()
    const sequenced = await Promise.all(
      Array.from({length: 130}, (_, index) =>
        pulse.publish({topic, data: {kind: 'sequenced', index}}),
      ),
    )
    const db = await rawDatabase(databaseName)
    const legacy = Array.from({length: 130}, (_, index) => ({
      _id: uuidv7(),
      topic,
      data: {kind: 'legacy', index},
      createdAt: new Date(Date.now() + index),
    }))
    await db.collection<any>('orionjs.pulse.events').insertMany(legacy)

    const received = new Set<string>()
    await pulse.subscribe(topic, async event => void received.add(event.id), {
      offsetReset: 'earliest',
      maxConcurrency: 8,
    })
    await waitFor(() => received.size === sequenced.length + legacy.length, {timeoutMs: 20_000})
    expect(sequenced.every(event => received.has(event.id))).toBe(true)
    expect(legacy.every(event => received.has(event._id))).toBe(true)
  })

  it('fences a discovery reader that loses its lease while a batch query is in flight', async () => {
    const databaseName = uniqueName('discovery_mid_batch_failover')
    const consumerGroup = 'discovery-mid-batch-failover-group'
    const topic = 'discovery-mid-batch.topic'
    const replicas = Array.from({length: 2}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 4,
        pollIntervalMs: 20,
        discoveryLockTimeoutMs: 100,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    const calls = new Map<string, number>()
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe(
          topic,
          async event => {
            calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
          },
          {maxConcurrency: 4},
        ),
      ),
    )
    const states = replicas.map(getRuntimeState)
    await waitFor(
      () => states.reduce((total, state) => total + state.discoveryLeases.size, 0) === 1,
    )
    const leaderIndex = states.findIndex(state => state.discoveryLeases.has(topic))
    const leader = states[leaderIndex]
    const db = await rawDatabase(databaseName)
    const before = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })

    const originalAggregate = leader.collections.events.aggregate.bind(leader.collections.events)
    let delayNextBatch = true
    leader.collections.events.aggregate = (...args: any[]) => {
      const cursor = originalAggregate(...args)
      if (!delayNextBatch) return cursor
      delayNextBatch = false
      const originalToArray = cursor.toArray.bind(cursor)
      cursor.toArray = async () => {
        await new Promise(resolve => setTimeout(resolve, 260))
        return await originalToArray()
      }
      return cursor
    }

    const events = await Promise.all(
      Array.from({length: 120}, (_, index) => replicas[index % 2].publish({topic, data: {index}})),
    )
    await waitFor(
      async () => {
        const current = await db.collection('orionjs.pulse.subscriptions').findOne({
          consumerGroup,
          topic,
        })
        return current?.discoveryLockToken !== before?.discoveryLockToken
      },
      {timeoutMs: 10_000},
    )
    await waitFor(() => calls.size === events.length, {timeoutMs: 20_000})
    await new Promise(resolve => setTimeout(resolve, 250))
    expect([...calls.values()].every(count => count === 1)).toBe(true)
  })

  it('does not advance a cursor across events skipped during lease loss and reacquisition', async () => {
    const databaseName = uniqueName('discovery_lease_flap')
    const consumerGroup = 'discovery-lease-flap-group'
    const topic = 'discovery-lease-flap.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      pollIntervalMs: 20,
      discoveryLockTimeoutMs: 1_000,
    })
    await pulse.awaitConnection()
    await pulse.subscribe(topic, async () => {}, {})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const db = await rawDatabase(databaseName)
    const events = Array.from({length: 60}, (_, index) => ({
      _id: uuidv7(),
      topic,
      data: {index},
      createdAt: new Date(Date.now() + index),
      sequence: new Timestamp({t: 10, i: index}),
    }))
    await db.collection<any>('orionjs.pulse.events').insertMany(events)

    const originalRefresh = runtime.refreshDiscoveryLeases.bind(runtime)
    let refreshes = 0
    runtime.refreshDiscoveryLeases = async () => {
      refreshes++
      if (refreshes === 2) {
        await db.collection('orionjs.pulse.subscriptions').updateOne(
          {consumerGroup, topic},
          {
            $set: {
              discoveryLockOwner: 'foreign-reader',
              discoveryLockToken: uuidv7(),
              discoveryLockedUntil: new Date(Date.now() + 1_000),
            },
          },
        )
        runtime.discoveryRefreshAt = 0
      } else if (refreshes === 3) {
        await db
          .collection('orionjs.pulse.subscriptions')
          .updateOne(
            {consumerGroup, topic},
            {$set: {discoveryLockedUntil: new Date(Date.now() - 1)}},
          )
        runtime.discoveryRefreshAt = 0
      }
      await originalRefresh()
    }

    await runtime.discoverEvents(true)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({consumerGroup, topic}),
    ).toBe(25)
    const afterFlap = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    expect(afterFlap?.cursorSequence).toBeUndefined()

    runtime.refreshDiscoveryLeases = originalRefresh
    runtime.discoveryRefreshAt = 0
    await runtime.discoverEvents(true)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({consumerGroup, topic}),
    ).toBe(events.length)
    const recovered = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    expect(recovered?.cursorSequenceEventId).toBe(events.at(-1)?._id)
  })

  it('cleans every earlier batch claim when a later claim gets a transient MongoDB error', async () => {
    const databaseName = uniqueName('claim_batch_cleanup')
    const consumerGroup = 'claim-batch-cleanup-group'
    const topic = 'claim-batch-cleanup.topic'
    const errors: Error[] = []
    const pulse = createPulse(databaseName, consumerGroup, {
      workerCount: 3,
      onError: error => errors.push(error),
    })
    await pulse.awaitConnection()
    await pulse.subscribe(topic, async () => {}, {
      maxConcurrency: 3,
    })
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    await Promise.all(Array.from({length: 3}, (_, index) => pulse.publish({topic, data: {index}})))
    await runtime.discoverEvents(true)
    const originalClaim = runtime.collections.deliveries.findOneAndUpdate.bind(
      runtime.collections.deliveries,
    )
    let claims = 0
    runtime.collections.deliveries.findOneAndUpdate = (...args: any[]) => {
      if (args[0]?.status === 'v2-pending' && args[1]?.$set?.status === 'v2-processing') {
        claims++
        if (claims === 2) throw new Error('synthetic second claim failure')
      }
      return originalClaim(...args)
    }

    runtime.running = true
    await expect(runtime.claimExecutions(3)).rejects.toThrow('synthetic second claim failure')
    runtime.running = false
    expect(runtime.localSubscriptions.get(topic)?.running).toBe(0)
    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        topic,
        status: 'v2-processing',
        lockToken: {$exists: true},
      }),
    ).toBe(0)
    expect(errors.some(error => error.message.includes('synthetic second'))).toBe(false)
  })

  it('rotates discovery and work fairly across more topics than one aggregate can hold', async () => {
    const databaseName = uniqueName('many_topic_rotation')
    const consumerGroup = 'many-topic-rotation-group'
    const topics = Array.from({length: 80}, (_, index) => `rotation.${index}`)
    const pulse = createPulse(databaseName, consumerGroup, {
      workerCount: 8,
      discoveryLockTimeoutMs: 500,
    })
    await pulse.awaitConnection()
    const received = new Set<string>()
    await Promise.all(
      topics.map(topic =>
        pulse.subscribe(topic, async event => void received.add(event.id), {
          maxConcurrency: 2,
        }),
      ),
    )
    await waitFor(() => getRuntimeState(pulse).discoveryLeases.size === topics.length)

    const events = await Promise.all(
      topics.map((topic, index) => pulse.publish({topic, data: {index}})),
    )
    await waitFor(() => received.size === topics.length, {timeoutMs: 20_000})
    expect(events.every(event => received.has(event.id))).toBe(true)
  })

  it('keeps claim contention bounded across twenty replicas', async () => {
    const databaseName = uniqueName('twenty_replica_contention')
    const consumerGroup = 'twenty-replica-contention-group'
    const topic = 'twenty-replica-contention.topic'
    const replicas = Array.from({length: 20}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 1,
        maxPoolSize: 2,
        pollIntervalMs: 20,
        lockTimeoutMs: 500,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    const calls = new Map<string, number>()
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe(
          topic,
          async event => {
            calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
          },
          {maxConcurrency: 1},
        ),
      ),
    )

    let claimAttempts = 0
    for (const runtime of replicas.map(getRuntimeState)) {
      const original = runtime.collections.deliveries.findOneAndUpdate.bind(
        runtime.collections.deliveries,
      )
      runtime.collections.deliveries.findOneAndUpdate = (...args: any[]) => {
        if (args[0]?.status === 'v2-pending' && args[1]?.$set?.status === 'v2-processing') {
          claimAttempts++
        }
        return original(...args)
      }
    }
    const events = await Promise.all(
      Array.from({length: 60}, (_, index) =>
        replicas[index % replicas.length].publish({topic, data: {index}}),
      ),
    )
    await waitFor(() => calls.size === events.length, {timeoutMs: 30_000})
    await new Promise(resolve => setTimeout(resolve, 250))
    expect([...calls.values()].every(count => count === 1)).toBe(true)
    expect(claimAttempts).toBeLessThan(events.length * 10)
  })

  it('survives a multi-publisher flood across eight competing replicas', async () => {
    const databaseName = uniqueName('multi_publisher_flood')
    const consumerGroup = 'multi-publisher-flood-group'
    const topic = 'multi-publisher-flood.topic'
    const eventCount = 500
    const replicas = Array.from({length: 8}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 2,
        maxPoolSize: 3,
        pollIntervalMs: 10,
        lockTimeoutMs: 500,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))

    const calls = new Map<string, number>()
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe(
          topic,
          async event => {
            calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
          },
          {
            offsetReset: 'latest',
            maxConcurrency: 2,
          },
        ),
      ),
    )

    const events = await Promise.all(
      Array.from({length: eventCount}, (_, index) =>
        replicas[index % replicas.length].publish({topic, data: {index}}),
      ),
    )
    await waitFor(() => calls.size === eventCount, {timeoutMs: 30_000})
    await new Promise(resolve => setTimeout(resolve, 300))

    const db = await rawDatabase(databaseName)
    const storedEvents = await db
      .collection('orionjs.pulse.events')
      .find({topic})
      .project({sequence: 1})
      .toArray()
    expect(events).toHaveLength(eventCount)
    expect([...calls.values()].every(count => count === 1)).toBe(true)
    expect(storedEvents).toHaveLength(eventCount)
    expect(new Set(storedEvents.map(event => event.sequence.toString())).size).toBe(eventCount)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        topic,
        status: 'v2-success',
      }),
    ).toBe(eventCount)
  })

  it('discovers a sequenced event even when its application clock is far behind', async () => {
    const databaseName = uniqueName('clock_skew')
    const consumerGroup = 'clock-skew-group'
    const topic = 'clock-skew.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const received: string[] = []

    await pulse.subscribe(
      topic,
      async event => {
        received.push((event.data as {label: string}).label)
      },
      {offsetReset: 'latest'},
    )
    await pulse.publish({topic, data: {label: 'baseline'}})
    await waitFor(() => received.includes('baseline'))
    await waitFor(async () => {
      const subscription = await db.collection('orionjs.pulse.subscriptions').findOne({
        consumerGroup,
        topic,
      })
      return subscription?.cursorSequence instanceof Timestamp
    })

    const eventId = uuidv7()
    await db.collection('orionjs.pulse.events').findOneAndUpdate(
      {_id: eventId, sequence: {$exists: false}},
      {
        $setOnInsert: {
          topic,
          data: {label: 'skewed'},
          createdAt: new Date('2000-01-01T00:00:00.000Z'),
        },
        $currentDate: {sequence: {$type: 'timestamp'}},
      },
      {upsert: true},
    )

    await waitFor(() => received.includes('skewed'))
    expect(received).toEqual(['baseline', 'skewed'])
  })

  it('keeps the legacy cursor independent during a rolling publisher upgrade', async () => {
    const databaseName = uniqueName('legacy_rolling_upgrade')
    const consumerGroup = 'legacy-rolling-upgrade-group'
    const topic = 'legacy-rolling-upgrade.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const received: string[] = []

    await pulse.subscribe(
      topic,
      async event => {
        received.push((event.data as {label: string}).label)
      },
      {offsetReset: 'latest'},
    )
    const initialSubscription = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    if (!initialSubscription?.cursorCreatedAt) {
      throw new Error('Latest subscription did not persist its legacy cursor.')
    }

    await new Promise(resolve => setTimeout(resolve, 30))
    await pulse.publish({topic, data: {label: 'sequenced'}})
    await waitFor(() => received.includes('sequenced'))

    const legacyEventId = uuidv7()
    await db.collection('orionjs.pulse.events').insertOne({
      _id: legacyEventId,
      topic,
      data: {label: 'legacy'},
      createdAt: new Date(initialSubscription.cursorCreatedAt.getTime() + 1),
    })

    await waitFor(() => received.includes('legacy'))
    expect(received).toEqual(['sequenced', 'legacy'])
  })

  it('migrates a pre-sequence subscription without re-executing retained deliveries', async () => {
    const databaseName = uniqueName('pre_sequence_subscription')
    const consumerGroup = 'pre-sequence-subscription-group'
    const topic = 'pre-sequence-subscription.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const cursorCreatedAt = new Date()
    const oldEvent = {
      _id: uuidv7(),
      topic,
      data: {kind: 'already-processed'},
      createdAt: new Date(cursorCreatedAt.getTime() - 1_000),
      sequence: new Timestamp({t: 20, i: 1}),
    }
    const newEvent = {
      _id: uuidv7(),
      topic,
      data: {kind: 'new'},
      createdAt: new Date(cursorCreatedAt.getTime() + 1_000),
      sequence: new Timestamp({t: 20, i: 2}),
    }
    await db.collection<any>('orionjs.pulse.events').insertMany([oldEvent, newEvent])
    const now = new Date()
    await db.collection<any>('orionjs.pulse.subscriptions').insertOne({
      _id: uuidv7(),
      consumerGroup,
      topic,
      offsetReset: 'latest',
      delivery: 'at-least-once',
      maxRetries: 3,
      retryDelayMs: 1_000,
      retryBackoffMultiplier: 2,
      createdAt: now,
      updatedAt: now,
      cursorCreatedAt,
      cursorEventId: '',
    })
    await db.collection<any>('orionjs.pulse.deliveries').insertOne({
      _id: uuidv7(),
      eventId: oldEvent._id,
      consumerGroup,
      topic,
      eventCreatedAt: oldEvent.createdAt,
      eventSequence: oldEvent.sequence,
      status: 'success',
      createdAt: now,
      updatedAt: now,
      endedAt: now,
      finalAttempt: 1,
    })

    const received: string[] = []
    await pulse.subscribe(topic, async event => void received.push(event.id), {
      offsetReset: 'latest',
    })
    await waitFor(() => received.includes(newEvent._id))
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(received).toEqual([newEvent._id])
    const migrated = await db.collection('orionjs.pulse.subscriptions').findOne({
      consumerGroup,
      topic,
    })
    expect(migrated?.cursorSequenceEventId).toBe(newEvent._id)
  })
})
