import {afterAll, afterEach, beforeAll, describe, expect, it, setDefaultTimeout} from 'bun:test'
import {type ChildProcess, spawn} from 'node:child_process'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
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

function getMaxPoolSize(pulse: Pulse<any>) {
  return (
    pulse as unknown as {
      client: {options: {maxPoolSize: number}}
    }
  ).client.options.maxPoolSize
}

function getRuntimeState(pulse: Pulse<any>) {
  return pulse as unknown as {
    coordinatorPromise?: Promise<void>
    activeExecutions: Set<Promise<void>>
    discoveryLeases: Map<string, unknown>
    discoveryRefreshAt: number
    localSubscriptions: Map<string, {running: number}>
    running: boolean
    collections: {
      events: any
      subscriptions: any
      deliveries: any
      history: any
    }
    wakeCoordinator(): void
    discoverEvents(scanEvents: boolean): Promise<{discovered: boolean; scanned: boolean}>
    refreshDiscoveryLeases(): Promise<void>
    findExecutionCandidates(capacity: number): Promise<unknown[]>
    claimExecutions(capacity: number): Promise<unknown[]>
    reapExpiredAttempts(topics: string[]): Promise<number>
    reconcileDeliveries(topics: string[]): Promise<number>
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

function collectNumericFields(value: unknown, field: string, result: number[] = []) {
  if (!value || typeof value !== 'object') return result
  for (const [key, nested] of Object.entries(value)) {
    if (key === field && typeof nested === 'number') result.push(nested)
    else collectNumericFields(nested, field, result)
  }
  return result
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
  it('uses a small MongoDB pool by default and supports an explicit override', async () => {
    const defaultPulse = createPulse(uniqueName('default_pool'), 'default-pool-group')
    const configuredPulse = createPulse(uniqueName('configured_pool'), 'configured-pool-group', {
      maxPoolSize: 12,
    })

    await Promise.all([defaultPulse.awaitConnection(), configuredPulse.awaitConnection()])

    expect(getMaxPoolSize(defaultPulse)).toBe(5)
    expect(getMaxPoolSize(configuredPulse)).toBe(12)
  })

  it('uses unordered delivery by default', async () => {
    const databaseName = uniqueName('default_unordered')
    const pulse = createPulse(databaseName, 'default-unordered-group')
    const subscription = await pulse.subscribe('default-unordered.topic', async () => {})

    expect(subscription.ordered).toBe(false)
    expect(subscription.maxConcurrency).toBe(4)

    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').findOne({
        consumerGroup: 'default-unordered-group',
        topic: 'default-unordered.topic',
      }),
    ).toMatchObject({ordered: false})
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
          name: 'pulse_subscriptions_ordered_lease',
          key: {consumerGroup: 1, orderedLockedUntil: 1},
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
          name: 'pulse_deliveries_dashboard_pending',
          key: {status: 1, eventCreatedAt: 1, eventId: 1},
        },
        {
          name: 'pulse_deliveries_expires_at_ttl',
          key: {expiresAt: 1},
          expireAfterSeconds: 0,
        },
      ],
      'orionjs.pulse.history': [
        {
          name: 'pulse_history_delivery_attempt_unique',
          key: {deliveryId: 1, attempt: 1},
          unique: true,
        },
        {
          name: 'pulse_history_group_topic_created',
          key: {consumerGroup: 1, topic: 1, createdAt: -1, _id: -1},
        },
        {name: 'pulse_history_event', key: {eventId: 1, createdAt: -1}},
        {name: 'pulse_history_dead_locks', key: {status: 1, lockedUntil: 1}},
        {
          name: 'pulse_history_group_dead_locks',
          key: {consumerGroup: 1, status: 1, lockedUntil: 1},
        },
        {
          name: 'pulse_history_pending_acquisition',
          key: {consumerGroup: 1, topic: 1, status: 1, nextAttemptAt: 1, createdAt: 1},
        },
        {
          name: 'pulse_history_expires_at_ttl',
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
      }
    }

    await Promise.all([
      db.collection('orionjs.pulse.history').dropIndex('pulse_history_event'),
      db.collection('orionjs.pulse.events').dropIndex('pulse_events_topic_sequence_id'),
    ])
    const reconnect = createPulse(databaseName, 'index-group')
    await reconnect.awaitConnection()
    const recreatedHistory = await db.collection('orionjs.pulse.history').listIndexes().toArray()
    const recreatedEvents = await db.collection('orionjs.pulse.events').listIndexes().toArray()
    expect(recreatedHistory.some(index => index.name === 'pulse_history_event')).toBe(true)
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

  it('uses indexed, non-blocking sorts for every hot polling branch', async () => {
    const databaseName = uniqueName('poll_explain')
    const consumerGroup = 'poll-explain-group'
    const topic = 'poll-explain.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const now = new Date()

    await db.collection<any>('orionjs.pulse.events').insertMany([
      ...Array.from({length: 500}, (_, index) => ({
        _id: uuidv7(),
        topic,
        data: {index},
        createdAt: new Date(now.getTime() + index),
        sequence: new Timestamp({t: 1, i: index}),
      })),
      {_id: uuidv7(), topic, data: {legacy: true}, createdAt: now},
    ])
    const deliveries = Array.from({length: 500}, (_, index) => ({
      _id: uuidv7(),
      eventId: uuidv7(),
      consumerGroup,
      topic,
      eventCreatedAt: new Date(now.getTime() + index),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }))
    await db.collection<any>('orionjs.pulse.deliveries').insertMany(deliveries)
    await db.collection<any>('orionjs.pulse.history').insertMany(
      deliveries.map((delivery, index) => ({
        _id: uuidv7(),
        deliveryId: delivery._id,
        eventId: delivery.eventId,
        consumerGroup,
        topic,
        attempt: 1,
        status: 'pending',
        createdAt: new Date(now.getTime() + index),
        nextAttemptAt: now,
      })),
    )

    const legacyExplain = await db
      .collection('orionjs.pulse.events')
      .find({topic, sequence: {$exists: false}, createdAt: {$gte: now}})
      .sort({createdAt: 1, _id: 1})
      .limit(100)
      .explain('executionStats')
    const deliveryExplain = await db
      .collection('orionjs.pulse.deliveries')
      .find({consumerGroup, topic, status: 'pending'})
      .sort({eventCreatedAt: 1, eventId: 1})
      .limit(1)
      .explain('executionStats')
    const dashboardPendingExplain = await db
      .collection('orionjs.pulse.deliveries')
      .find({status: 'pending'})
      .sort({eventCreatedAt: 1, eventId: 1})
      .limit(1)
      .explain('executionStats')
    const historyExplain = await db
      .collection('orionjs.pulse.history')
      .find({
        consumerGroup,
        topic,
        status: 'pending',
        nextAttemptAt: {$lte: now},
        lockToken: {$exists: false},
      })
      .sort({nextAttemptAt: 1, createdAt: 1})
      .limit(16)
      .explain('executionStats')
    const deadLockExplain = await db
      .collection('orionjs.pulse.history')
      .find({
        consumerGroup,
        topic: {$in: [topic]},
        status: 'pending',
        lockedUntil: {$lte: now},
        lockToken: {$exists: true},
      })
      .sort({lockedUntil: 1})
      .limit(25)
      .explain('executionStats')

    const assertions: Array<[unknown, string]> = [
      [legacyExplain, 'pulse_events_legacy_topic_created_id'],
      [deliveryExplain, 'pulse_deliveries_acquisition'],
      [dashboardPendingExplain, 'pulse_deliveries_dashboard_pending'],
      [historyExplain, 'pulse_history_pending_acquisition'],
      [deadLockExplain, 'pulse_history_group_dead_locks'],
    ]
    for (const [explain, expectedIndex] of assertions) {
      const winningPlan = JSON.stringify((explain as any).queryPlanner.winningPlan)
      expect(winningPlan).toContain(expectedIndex)
      expect(winningPlan).not.toContain('COLLSCAN')
      expect(winningPlan).not.toContain('"stage":"SORT"')
    }
  })

  it('keeps the real aggregate pipelines bounded at late cursors', async () => {
    const databaseName = uniqueName('real_pipeline_explain')
    const consumerGroup = 'real-pipeline-explain-group'
    const topic = 'real-pipeline-explain.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      pollIntervalMs: 20,
      discoveryLockTimeoutMs: 1_000,
    })
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const base = Date.now() - 10_000
    await db.collection<any>('orionjs.pulse.events').insertMany([
      ...Array.from({length: 2_000}, (_, index) => ({
        _id: uuidv7(),
        topic,
        data: {index},
        createdAt: new Date(base + index),
        sequence: new Timestamp({t: 40, i: index}),
      })),
      ...Array.from({length: 2_000}, (_, index) => ({
        _id: uuidv7(),
        topic,
        data: {index},
        createdAt: new Date(base + index),
      })),
    ])
    await pulse.subscribe(topic, async () => {}, {ordered: true, offsetReset: 'latest'})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const originalEventsAggregate = runtime.collections.events.aggregate.bind(
      runtime.collections.events,
    )
    let discoveryPipeline: any[] | undefined
    runtime.collections.events.aggregate = (...args: any[]) => {
      discoveryPipeline = args[0]
      return originalEventsAggregate(...args)
    }
    await runtime.discoverEvents(true)
    if (!discoveryPipeline) throw new Error('Discovery did not issue an aggregate pipeline.')
    const discoveryExplain = await db
      .collection('orionjs.pulse.events')
      .aggregate(discoveryPipeline)
      .explain('executionStats')
    const discoveryPlan = JSON.stringify(discoveryExplain)
    expect(discoveryPlan).toContain('pulse_events_topic_sequence_id')
    expect(discoveryPlan).toContain('pulse_events_legacy_topic_created_id')
    expect(discoveryPlan).not.toContain('COLLSCAN')
    expect(collectNumericFields(discoveryExplain, 'totalKeysExamined').length).toBeGreaterThan(0)
    expect(Math.max(...collectNumericFields(discoveryExplain, 'totalKeysExamined'))).toBeLessThan(
      25,
    )

    const originalDeliveriesAggregate = runtime.collections.deliveries.aggregate.bind(
      runtime.collections.deliveries,
    )
    let workPipeline: any[] | undefined
    runtime.collections.deliveries.aggregate = (...args: any[]) => {
      workPipeline = args[0]
      return originalDeliveriesAggregate(...args)
    }
    await runtime.findExecutionCandidates(1)
    if (!workPipeline) throw new Error('Work polling did not issue an aggregate pipeline.')
    const workExplain = await db
      .collection('orionjs.pulse.deliveries')
      .aggregate(workPipeline)
      .explain('executionStats')
    const workPlan = JSON.stringify(workExplain)
    expect(workPlan).toContain('pulse_deliveries_acquisition')
    expect(workPlan).toContain('pulse_deliveries_sequence_acquisition')
    expect(workPlan).not.toContain('COLLSCAN')
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

  it('uses UUIDv7 strings and writes a locked pending history before the callback', async () => {
    const databaseName = uniqueName('history_first')
    const pulse = createPulse(databaseName, 'history-group')
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

    await pulse.subscribe(
      'history.topic',
      async () => {
        entered()
        await gate
      },
      {offsetReset: 'latest'},
    )
    const event = await pulse.publish({topic: 'history.topic', data: {value: 1}})
    await callbackEntered

    const pending = await db.collection<any>('orionjs.pulse.history').findOne({eventId: event.id})
    expect(pending?.status).toBe('pending')
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
      const record = await db.collection('orionjs.pulse.history').findOne({eventId: event.id})
      return record?.status === 'success'
    })

    for (const collectionName of [
      'orionjs.pulse.events',
      'orionjs.pulse.subscriptions',
      'orionjs.pulse.deliveries',
      'orionjs.pulse.history',
    ]) {
      const documents = await db.collection(collectionName).find().toArray()
      expect(documents.length).toBeGreaterThan(0)
      expect(documents.every(document => uuidV7Pattern.test(String(document._id)))).toBe(true)
    }
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
              ordered: false,
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

  it('uses one empty work poll and one discovery query for all local topics', async () => {
    const databaseName = uniqueName('aggregate_poll')
    const pulse = createPulse(databaseName, 'aggregate-poll-group', {
      pollIntervalMs: 30,
      discoveryLockTimeoutMs: 30_000,
    })
    await pulse.awaitConnection()

    const topics = ['aggregate.a', 'aggregate.b', 'aggregate.c', 'aggregate.d']
    await Promise.all([
      pulse.subscribe(topics[0], async () => {}, {ordered: true}),
      pulse.subscribe(topics[1], async () => {}, {ordered: true}),
      pulse.subscribe(topics[2], async () => {}, {ordered: false}),
      pulse.subscribe(topics[3], async () => {}, {ordered: false}),
    ])

    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.size === topics.length)
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    const originalDeliveriesAggregate = runtime.collections.deliveries.aggregate.bind(
      runtime.collections.deliveries,
    )
    const originalHistoryAggregate = runtime.collections.history.aggregate.bind(
      runtime.collections.history,
    )
    let workPolls = 0
    runtime.collections.deliveries.aggregate = (...args: any[]) => {
      workPolls++
      return originalDeliveriesAggregate(...args)
    }
    runtime.collections.history.aggregate = (...args: any[]) => {
      workPolls++
      return originalHistoryAggregate(...args)
    }

    expect(await runtime.findExecutionCandidates(4)).toEqual([])
    expect(workPolls).toBe(1)

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
    await pulse.subscribe(topic, async () => {}, {ordered: false})
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise
    await Promise.all(
      Array.from({length: 100}, (_, index) => pulse.publish({topic, data: {index}})),
    )

    let deliveryBulkWrites = 0
    let historyBulkWrites = 0
    const originalDeliveryBulkWrite = runtime.collections.deliveries.bulkWrite.bind(
      runtime.collections.deliveries,
    )
    const originalHistoryBulkWrite = runtime.collections.history.bulkWrite.bind(
      runtime.collections.history,
    )
    runtime.collections.deliveries.bulkWrite = (...args: any[]) => {
      deliveryBulkWrites++
      return originalDeliveryBulkWrite(...args)
    }
    runtime.collections.history.bulkWrite = (...args: any[]) => {
      historyBulkWrites++
      return originalHistoryBulkWrite(...args)
    }

    await runtime.discoverEvents(true)
    expect(deliveryBulkWrites).toBe(4)
    expect(historyBulkWrites).toBe(4)
    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({consumerGroup, topic}),
    ).toBe(100)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({consumerGroup, topic}),
    ).toBe(100)
  })

  it('does not churn ordered leases while a retry is delayed', async () => {
    const databaseName = uniqueName('ordered_retry_lease')
    const pulse = createPulse(databaseName, 'ordered-retry-lease-group', {
      pollIntervalMs: 10,
    })
    await pulse.awaitConnection()

    let callbacks = 0
    await pulse.subscribe(
      'ordered-retry-lease.topic',
      async () => {
        callbacks++
        if (callbacks === 1) throw new Error('retry once')
      },
      {ordered: true, retryDelayMs: 400, maxRetries: 1},
    )

    const subscriptions = getRuntimeState(pulse).collections.subscriptions
    const originalFindOneAndUpdate = subscriptions.findOneAndUpdate.bind(subscriptions)
    let orderedLeaseAcquisitions = 0
    subscriptions.findOneAndUpdate = async (...args: any[]) => {
      if (args[1]?.$set?.orderedLockToken) orderedLeaseAcquisitions++
      return await originalFindOneAndUpdate(...args)
    }

    await pulse.publish({topic: 'ordered-retry-lease.topic', data: null})
    const db = await rawDatabase(databaseName)
    await waitFor(async () => {
      const retry = await db.collection('orionjs.pulse.history').findOne({
        consumerGroup: 'ordered-retry-lease-group',
        topic: 'ordered-retry-lease.topic',
        attempt: 2,
        status: 'pending',
      })
      return Boolean(retry)
    })

    expect(orderedLeaseAcquisitions).toBe(1)
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(orderedLeaseAcquisitions).toBe(1)

    await waitFor(() => callbacks === 2)
    expect(orderedLeaseAcquisitions).toBe(2)
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
    const options = {ordered: false, offsetReset: 'latest' as const}
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

  it('retries with exponential backoff and preserves ordered processing', async () => {
    const databaseName = uniqueName('ordered_retries')
    const pulse = createPulse(databaseName, 'ordered-group')
    await pulse.awaitConnection()
    const calls: string[] = []

    await pulse.subscribe(
      'ordered.topic',
      async event => {
        const label = (event.data as {label: string}).label
        calls.push(`${label}:${event.attempt}`)
        if (label === 'A' && event.attempt < 4) throw new Error('retry')
      },
      {
        ordered: true,
        offsetReset: 'latest',
        maxRetries: 3,
        retryDelayMs: 10,
        retryBackoffMultiplier: 2,
      },
    )

    const first = await pulse.publish({topic: 'ordered.topic', data: {label: 'A'}})
    await pulse.publish({topic: 'ordered.topic', data: {label: 'B'}})
    await waitFor(() => calls.includes('B:1'))
    expect(calls).toEqual(['A:1', 'A:2', 'A:3', 'A:4', 'B:1'])

    const history = await pulse.history.find({eventId: first.id, limit: 10})
    expect(history.records.map(record => record.status).sort()).toEqual([
      'error',
      'error',
      'error',
      'success',
    ])
  })

  it('processes multiple deliveries concurrently when ordered is false', async () => {
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
      {ordered: false, maxConcurrency: 4, offsetReset: 'latest'},
    )
    await Promise.all(
      Array.from({length: 4}, (_, index) =>
        pulse.publish({topic: 'concurrent.topic', data: {index}}),
      ),
    )
    await waitFor(() => completed === 4)
    expect(maximumActive).toBeGreaterThan(1)
  })

  it('marks an exhausted delivery as error and continues with the next ordered event', async () => {
    const databaseName = uniqueName('terminal_error')
    const pulse = createPulse(databaseName, 'terminal-error-group')
    await pulse.awaitConnection()
    const calls: string[] = []

    await pulse.subscribe(
      'terminal.topic',
      async event => {
        const label = (event.data as {label: string}).label
        calls.push(`${label}:${event.attempt}`)
        if (label === 'bad') throw new Error('always fails')
      },
      {
        ordered: true,
        offsetReset: 'latest',
        maxRetries: 1,
        retryDelayMs: 10,
      },
    )
    const failed = await pulse.publish({topic: 'terminal.topic', data: {label: 'bad'}})
    await pulse.publish({topic: 'terminal.topic', data: {label: 'good'}})

    await waitFor(() => calls.includes('good:1'))
    expect(calls).toEqual(['bad:1', 'bad:2', 'good:1'])
    const history = await pulse.history.find({eventId: failed.id})
    expect(history.records).toHaveLength(2)
    expect(history.records.every(record => record.status === 'error')).toBe(true)
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
      {delivery: 'at-most-once', ordered: true, offsetReset: 'latest'},
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

  it('recovers a pending locked attempt after its machine is killed', async () => {
    const databaseName = uniqueName('machine_crash')
    const topic = 'crash.topic'
    const consumerGroup = 'crash-group'
    const publisher = createPulse(databaseName, 'publisher')
    await publisher.awaitConnection()
    const event = await publisher.publish({topic, data: {value: 1}})
    const db = await rawDatabase(databaseName)

    const fixturePath = join(
      fileURLToPath(new URL('.', import.meta.url)),
      'fixtures/crash-consumer.ts',
    )
    const child = spawn(process.execPath, [fixturePath], {
      env: {
        ...process.env,
        PULSE_TEST_CONNECTION_STRING: standalone.getUri(databaseName),
        PULSE_TEST_DATABASE_NAME: databaseName,
        PULSE_TEST_TOPIC: topic,
        PULSE_TEST_CONSUMER_GROUP: consumerGroup,
      },
      stdio: 'ignore',
    })
    childProcesses.add(child)

    await waitFor(async () => {
      const history = await db.collection('orionjs.pulse.history').findOne({eventId: event.id})
      return history?.status === 'pending' && history?.lockedUntil > new Date()
    })
    child.kill('SIGKILL')
    await new Promise<void>(resolve => child.once('exit', () => resolve()))
    childProcesses.delete(child)

    let recovered = 0
    const recovery = createPulse(databaseName, consumerGroup, {
      workerCount: 1,
      lockTimeoutMs: 200,
      discoveryLockTimeoutMs: 200,
    })
    await recovery.awaitConnection()
    await recovery.subscribe(
      topic,
      async () => {
        recovered++
      },
      {
        ordered: true,
        offsetReset: 'earliest',
        delivery: 'at-least-once',
        maxRetries: 3,
        retryDelayMs: 10,
        retryBackoffMultiplier: 2,
      },
    )

    await waitFor(() => recovered === 1)
    const histories = await db
      .collection('orionjs.pulse.history')
      .find({eventId: event.id})
      .sort({attempt: 1})
      .toArray()
    expect(histories).toHaveLength(2)
    expect(histories[0].status).toBe('error')
    expect(histories[0].error.code).toBe('worker_lost')
    expect(histories[1].status).toBe('success')
  })

  it('uses fencing tokens so a stale worker cannot acknowledge a reaped attempt', async () => {
    const databaseName = uniqueName('fencing')
    const pulse = createPulse(databaseName, 'fencing-group', {lockTimeoutMs: 120})
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const attempts: number[] = []

    await pulse.subscribe(
      'fencing.topic',
      async event => {
        attempts.push(event.attempt)
        if (event.attempt !== 1) return

        await db.collection('orionjs.pulse.history').updateOne(
          {eventId: event.id, attempt: 1, status: 'pending'},
          {
            $set: {
              lockToken: uuidv7(),
              lockedUntil: new Date(Date.now() - 1),
            },
          },
        )
        await new Promise(resolve => setTimeout(resolve, 150))
      },
      {
        ordered: false,
        offsetReset: 'latest',
        maxRetries: 1,
        retryDelayMs: 10,
      },
    )

    const event = await pulse.publish({topic: 'fencing.topic', data: null})
    await waitFor(() => attempts.includes(2))
    const histories = await db
      .collection('orionjs.pulse.history')
      .find({eventId: event.id})
      .sort({attempt: 1})
      .toArray()

    expect(histories).toHaveLength(2)
    expect(histories[0].status).toBe('error')
    expect(histories[0].error.code).toBe('worker_lost')
    expect(histories[1].status).toBe('success')
  })

  it('reconciles success history left behind before its delivery was finalized', async () => {
    const databaseName = uniqueName('partial_success')
    const consumerGroup = 'partial-success-group'
    const topic = 'partial.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    const eventId = uuidv7()
    const deliveryId = uuidv7()

    await db.collection<any>('orionjs.pulse.events').insertOne({
      _id: eventId,
      topic,
      data: {value: 1},
      createdAt,
    })
    await db.collection<any>('orionjs.pulse.deliveries').insertOne({
      _id: deliveryId,
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: createdAt,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    })
    await db.collection<any>('orionjs.pulse.history').insertOne({
      _id: uuidv7(),
      deliveryId,
      eventId,
      consumerGroup,
      topic,
      attempt: 1,
      status: 'success',
      createdAt,
      nextAttemptAt: createdAt,
      startedAt: createdAt,
      endedAt: createdAt,
      durationMs: 0,
    })

    let callbackCount = 0
    await pulse.subscribe(
      topic,
      async () => {
        callbackCount++
      },
      {offsetReset: 'earliest'},
    )

    await waitFor(async () => {
      const delivery = await db
        .collection<any>('orionjs.pulse.deliveries')
        .findOne({_id: deliveryId})
      return delivery?.status === 'success'
    })
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(callbackCount).toBe(0)
  })
})

describe('Pulse disaster recovery and edge cases', () => {
  it('reaps and reconciles multiple damaged deliveries in one coordinator pass', async () => {
    const databaseName = uniqueName('batched_recovery')
    const consumerGroup = 'batched-recovery-group'
    const topic = 'batched-recovery.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const subscription = await pulse.subscribe(topic, async () => {}, {
      offsetReset: 'earliest',
      maxRetries: 1,
      retryDelayMs: 1000,
    })
    await subscription.unsubscribe()

    const db = await rawDatabase(databaseName)
    const now = new Date()
    const expiredAt = new Date(now.getTime() - 1000)
    const expiredDeliveries = Array.from({length: 3}, () => ({
      _id: uuidv7(),
      eventId: uuidv7(),
      consumerGroup,
      topic,
      eventCreatedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }))
    const tornDeliveries = Array.from({length: 3}, () => ({
      _id: uuidv7(),
      eventId: uuidv7(),
      consumerGroup,
      topic,
      eventCreatedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }))
    await db
      .collection('orionjs.pulse.deliveries')
      .insertMany([...expiredDeliveries, ...tornDeliveries])
    await db.collection('orionjs.pulse.history').insertMany(
      expiredDeliveries.map(delivery => ({
        _id: uuidv7(),
        deliveryId: delivery._id,
        eventId: delivery.eventId,
        consumerGroup,
        topic,
        attempt: 1,
        status: 'pending',
        createdAt: expiredAt,
        nextAttemptAt: expiredAt,
        startedAt: expiredAt,
        lockOwner: uuidv7(),
        lockToken: uuidv7(),
        lockedAt: expiredAt,
        lockedUntil: expiredAt,
        heartbeatAt: expiredAt,
      })),
    )

    const runtime = getRuntimeState(pulse)
    expect(await runtime.reapExpiredAttempts([topic])).toBe(3)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        deliveryId: {$in: expiredDeliveries.map(delivery => delivery._id)},
        status: 'error',
        'error.code': 'worker_lost',
      }),
    ).toBe(3)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        deliveryId: {$in: expiredDeliveries.map(delivery => delivery._id)},
        attempt: 2,
        status: 'pending',
      }),
    ).toBe(3)

    expect(await runtime.reconcileDeliveries([topic])).toBe(3)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        deliveryId: {$in: tornDeliveries.map(delivery => delivery._id)},
        attempt: 1,
        status: 'pending',
      }),
    ).toBe(3)
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
      {ordered: 'yes' as any},
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
        ordered: false,
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

    let calls = 0
    const handler = async () => {
      calls++
      await new Promise(resolve => setTimeout(resolve, 320))
    }
    const options = {
      ordered: false,
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
      {ordered: false, offsetReset: 'latest', maxRetries: 2, retryDelayMs: 10},
    )
    const event = await replicaA.publish({topic: 'graceful-close.topic', data: null})
    await entered

    await replicaB.subscribe(
      'graceful-close.topic',
      async () => {
        recoveryCalls++
      },
      {ordered: false, offsetReset: 'latest', maxRetries: 2, retryDelayMs: 10},
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
    const history = await db.collection('orionjs.pulse.history').findOne({
      consumerGroup,
      eventId: event.id,
    })

    expect(delivery?.status).toBe('success')
    expect(history?.status).toBe('success')
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
        ordered: false,
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
        ordered: false,
        offsetReset: 'latest',
        maxConcurrency: 4,
      },
    )
    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.deliveries').countDocuments({
          consumerGroup,
          topic,
          status: 'success',
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
      return delivery?.status === 'error'
    })
    const history = await db.collection('orionjs.pulse.history').findOne({
      consumerGroup,
      eventId: event.id,
    })

    expect(history?.error.code).toBe('handler_error')
    expect(history?.error.message).toBe('Handler threw an unreadable value.')
    expect(history?.lockToken).toMatch(uuidV7Pattern)
    expect(history?.status).toBe('error')
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
        ordered: true,
        offsetReset: 'latest',
        maxRetries: 1,
        retryDelayMs: 4000,
      },
    )
    const event = await pulse.publish({topic, data: null})

    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.history').countDocuments({
          eventId: event.id,
          status: 'pending',
          attempt: 2,
        })) === 1,
    )
    await new Promise(resolve => setTimeout(resolve, 1600))

    const waitingHistories = await db
      .collection('orionjs.pulse.history')
      .find({eventId: event.id})
      .sort({attempt: 1})
      .toArray()
    expect(waitingHistories.map(history => history.attempt)).toEqual([1, 2])
    expect(waitingHistories[0].expiresAt).toBeUndefined()
    expect(waitingHistories[1].expiresAt).toBeUndefined()

    await db
      .collection('orionjs.pulse.history')
      .updateOne({eventId: event.id, attempt: 2}, {$set: {nextAttemptAt: new Date()}})
    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({
        consumerGroup,
        eventId: event.id,
      })
      return delivery?.status === 'success'
    })

    const terminalHistories = await db
      .collection('orionjs.pulse.history')
      .find({eventId: event.id})
      .sort({attempt: 1})
      .toArray()
    expect(terminalHistories).toHaveLength(2)
    expect(terminalHistories.every(history => history.expiresAt instanceof Date)).toBe(true)
    expect(terminalHistories[0].expiresAt.getTime()).toBe(terminalHistories[1].expiresAt.getTime())

    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.history').countDocuments({eventId: event.id})) === 0 &&
        (await db.collection('orionjs.pulse.deliveries').countDocuments({eventId: event.id})) === 0,
      {timeoutMs: 8000, intervalMs: 100},
    )
  })

  it('repairs retention after a crash between terminal delivery and TTL writes', async () => {
    const databaseName = uniqueName('terminal_retention_repair')
    const consumerGroup = 'terminal-retention-repair-group'
    const topic = 'terminal-retention-repair.topic'
    const pulse = createPulse(databaseName, consumerGroup, {
      historyRetentionMs: 5000,
      workerCount: 2,
    })
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const endedAt = new Date()
    const eventId = uuidv7()
    const deliveryId = uuidv7()

    await db.collection('orionjs.pulse.deliveries').insertOne({
      _id: deliveryId,
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: endedAt,
      status: 'success',
      finalAttempt: 1,
      createdAt: endedAt,
      updatedAt: endedAt,
      endedAt,
    })
    await db.collection('orionjs.pulse.history').insertOne({
      _id: uuidv7(),
      deliveryId,
      eventId,
      consumerGroup,
      topic,
      attempt: 1,
      status: 'success',
      createdAt: endedAt,
      nextAttemptAt: endedAt,
      startedAt: endedAt,
      endedAt,
    })

    await pulse.subscribe(topic, async () => {}, {offsetReset: 'latest'})
    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
      const history = await db.collection('orionjs.pulse.history').findOne({deliveryId})
      return delivery?.expiresAt instanceof Date && history?.expiresAt instanceof Date
    })

    const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
    const history = await db.collection('orionjs.pulse.history').findOne({deliveryId})
    expect(delivery?.expiresAt.getTime()).toBe(history?.expiresAt.getTime())
  })

  it('repairs a delivery that was persisted without its first history attempt', async () => {
    const databaseName = uniqueName('missing_history')
    const consumerGroup = 'missing-history-group'
    const topic = 'missing-history.topic'
    const replicaA = createPulse(databaseName, consumerGroup)
    const replicaB = createPulse(databaseName, consumerGroup)
    await Promise.all([replicaA.awaitConnection(), replicaB.awaitConnection()])
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    const eventId = uuidv7()
    const deliveryId = uuidv7()

    await db.collection('orionjs.pulse.events').insertOne({
      _id: eventId,
      topic,
      data: {value: 1},
      createdAt,
    })
    await db.collection('orionjs.pulse.deliveries').insertOne({
      _id: deliveryId,
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: createdAt,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    })

    let calls = 0
    const handler = async () => {
      calls++
    }
    const options = {ordered: false, offsetReset: 'earliest' as const}
    await Promise.all([
      replicaA.subscribe(topic, handler, options),
      replicaB.subscribe(topic, handler, options),
    ])

    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
      return delivery?.status === 'success'
    })

    expect(calls).toBe(1)
    expect(await db.collection('orionjs.pulse.history').countDocuments({deliveryId})).toBe(1)
  })

  it('rotates reconciliation past healthy heads in at least twenty-five topics', async () => {
    const databaseName = uniqueName('reconciliation_head_rotation')
    const consumerGroup = 'reconciliation-head-rotation-group'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const runtime = getRuntimeState(pulse)
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise
    const db = await rawDatabase(databaseName)
    const topics = Array.from({length: 25}, (_, index) => `reconciliation-head.${index}`)
    const now = new Date()
    const deliveries = topics.map((topic, index) => ({
      _id: uuidv7(),
      eventId: uuidv7(),
      consumerGroup,
      topic,
      eventCreatedAt: new Date(now.getTime() + index),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }))
    const torn = {
      _id: uuidv7(),
      eventId: uuidv7(),
      consumerGroup,
      topic: topics[0],
      eventCreatedAt: new Date(now.getTime() + 10_000),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    await db.collection<any>('orionjs.pulse.deliveries').insertMany([...deliveries, torn])
    await db.collection<any>('orionjs.pulse.history').insertMany(
      deliveries.map(delivery => ({
        _id: uuidv7(),
        deliveryId: delivery._id,
        eventId: delivery.eventId,
        consumerGroup,
        topic: delivery.topic,
        attempt: 1,
        status: 'pending',
        createdAt: now,
        nextAttemptAt: new Date(now.getTime() + 60_000),
      })),
    )

    expect(await runtime.reconcileDeliveries(topics)).toBe(0)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({deliveryId: torn._id}),
    ).toBe(0)
    expect(await runtime.reconcileDeliveries(topics)).toBe(1)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({deliveryId: torn._id}),
    ).toBe(1)
  })

  it('creates exactly one retry when replicas reconcile the same partial error', async () => {
    const databaseName = uniqueName('partial_error')
    const consumerGroup = 'partial-error-group'
    const topic = 'partial-error.topic'
    const replicaA = createPulse(databaseName, consumerGroup)
    const replicaB = createPulse(databaseName, consumerGroup)
    await Promise.all([replicaA.awaitConnection(), replicaB.awaitConnection()])
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    const eventId = uuidv7()
    const deliveryId = uuidv7()

    await db.collection('orionjs.pulse.events').insertOne({
      _id: eventId,
      topic,
      data: {value: 1},
      createdAt,
    })
    await db.collection('orionjs.pulse.deliveries').insertOne({
      _id: deliveryId,
      eventId,
      consumerGroup,
      topic,
      eventCreatedAt: createdAt,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    })
    await db.collection('orionjs.pulse.history').insertOne({
      _id: uuidv7(),
      deliveryId,
      eventId,
      consumerGroup,
      topic,
      attempt: 1,
      status: 'error',
      createdAt,
      nextAttemptAt: createdAt,
      startedAt: createdAt,
      endedAt: createdAt,
      durationMs: 0,
      error: {
        code: 'handler_error',
        name: 'Error',
        message: 'crashed before retry creation',
      },
    })

    const attempts: number[] = []
    const handler = async (event: {attempt: number}) => {
      attempts.push(event.attempt)
    }
    const options = {
      ordered: false,
      offsetReset: 'earliest' as const,
      maxRetries: 3,
      retryDelayMs: 10,
    }
    await Promise.all([
      replicaA.subscribe(topic, handler as any, options),
      replicaB.subscribe(topic, handler as any, options),
    ])

    await waitFor(async () => {
      const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
      return delivery?.status === 'success'
    })
    const histories = await db
      .collection('orionjs.pulse.history')
      .find({deliveryId})
      .sort({attempt: 1})
      .toArray()

    expect(histories.map(history => history.attempt)).toEqual([1, 2])
    expect(histories.map(history => history.status)).toEqual(['error', 'success'])
    expect(attempts).toEqual([2])
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
        ordered: false,
        offsetReset: 'latest',
        maxRetries: 2,
        retryDelayMs: 500,
      },
    )
    const event = await first.publish({topic, data: null})
    await waitFor(
      async () =>
        (await db.collection('orionjs.pulse.history').countDocuments({
          eventId: event.id,
          attempt: 2,
          status: 'pending',
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
        ordered: false,
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
      return delivery?.status === 'success'
    })
    const histories = await db
      .collection('orionjs.pulse.history')
      .find({eventId: event.id})
      .sort({attempt: 1})
      .toArray()

    expect(firstCalls).toBe(1)
    expect(resumedAttempts).toEqual([2])
    expect(histories.map(history => history.attempt)).toEqual([1, 2])
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
          {ordered: false, offsetReset: 'latest', maxConcurrency: 1},
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
      await db.collection('orionjs.pulse.history').countDocuments({
        eventId: event.id,
        status: 'success',
      }),
    ).toBe(groupCount)
  })

  it('serializes one ordered topic globally across many replicas and workers', async () => {
    const databaseName = uniqueName('ordered_global_mutex')
    const consumerGroup = 'ordered-global-mutex-group'
    const topic = 'ordered-global-mutex.topic'
    const replicas = Array.from({length: 6}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 4,
        lockTimeoutMs: 120,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    let active = 0
    let maximumActive = 0
    const calls = new Map<string, number>()
    const handler = async (event: {id: string}) => {
      calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
      active++
      maximumActive = Math.max(maximumActive, active)
      await new Promise(resolve => setTimeout(resolve, 4))
      active--
    }
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe(topic, handler as any, {
          ordered: true,
          offsetReset: 'latest',
        }),
      ),
    )

    let orderedLeaseAttempts = 0
    for (const runtime of replicas.map(getRuntimeState)) {
      const original = runtime.collections.subscriptions.findOneAndUpdate.bind(
        runtime.collections.subscriptions,
      )
      runtime.collections.subscriptions.findOneAndUpdate = (...args: any[]) => {
        if (args[1]?.$set?.orderedLockToken) orderedLeaseAttempts++
        return original(...args)
      }
    }

    const events = await Promise.all(
      Array.from({length: 100}, (_, index) =>
        replicas[index % replicas.length].publish({topic, data: {index}}),
      ),
    )
    await waitFor(() => calls.size === events.length, {timeoutMs: 20_000})
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(maximumActive).toBe(1)
    expect([...calls.values()].every(count => count === 1)).toBe(true)
    expect(orderedLeaseAttempts).toBeLessThan(events.length * 2)
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
        ordered: true,
        offsetReset: 'latest',
        maxRetries: 4,
        retryDelayMs: 25,
      },
    )
    await expect(
      incompatible.subscribe(topic, async () => {}, {
        ordered: false,
        offsetReset: 'latest',
        maxRetries: 4,
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
        ordered: false,
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
      {ordered: false, offsetReset: 'latest', maxConcurrency: 1},
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

  it('converges a large mixed set of torn persistence states under replica contention', async () => {
    const databaseName = uniqueName('mixed_torn_states')
    const consumerGroup = 'mixed-torn-states-group'
    const topic = 'mixed-torn-states.topic'
    const categories = [
      'no-history',
      'success-before-delivery',
      'error-before-retry',
      'expired-active-lock',
      'exhausted-error',
      'missing-event',
    ] as const
    const replicas = Array.from({length: 6}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 3,
        lockTimeoutMs: 150,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))
    const db = await rawDatabase(databaseName)
    const events: Record<string, unknown>[] = []
    const deliveries: Record<string, unknown>[] = []
    const histories: Record<string, unknown>[] = []
    const expectedCallbacks = new Map<string, number>()
    const categoryByEvent = new Map<string, (typeof categories)[number]>()

    for (const [categoryIndex, category] of categories.entries()) {
      for (let index = 0; index < 8; index++) {
        const createdAt = new Date(Date.now() + categoryIndex * 100 + index)
        const eventId = uuidv7()
        const deliveryId = uuidv7()
        categoryByEvent.set(eventId, category)
        if (category !== 'missing-event') {
          events.push({
            _id: eventId,
            topic,
            data: {category, index},
            createdAt,
          })
        }
        deliveries.push({
          _id: deliveryId,
          eventId,
          consumerGroup,
          topic,
          eventCreatedAt: createdAt,
          status: 'pending',
          createdAt,
          updatedAt: createdAt,
        })

        if (category === 'success-before-delivery') {
          histories.push({
            _id: uuidv7(),
            deliveryId,
            eventId,
            consumerGroup,
            topic,
            attempt: 1,
            status: 'success',
            createdAt,
            nextAttemptAt: createdAt,
            startedAt: createdAt,
            endedAt: createdAt,
          })
        } else if (category === 'error-before-retry' || category === 'exhausted-error') {
          const attempt = category === 'exhausted-error' ? 4 : 1
          histories.push({
            _id: uuidv7(),
            deliveryId,
            eventId,
            consumerGroup,
            topic,
            attempt,
            status: 'error',
            createdAt,
            nextAttemptAt: createdAt,
            startedAt: createdAt,
            endedAt: createdAt,
            error: {
              code: 'handler_error',
              name: 'Error',
              message: 'injected torn state',
            },
          })
        } else if (category === 'expired-active-lock') {
          histories.push({
            _id: uuidv7(),
            deliveryId,
            eventId,
            consumerGroup,
            topic,
            attempt: 1,
            status: 'pending',
            createdAt,
            nextAttemptAt: createdAt,
            startedAt: createdAt,
            lockedAt: new Date(createdAt.getTime() - 500),
            lockedUntil: new Date(createdAt.getTime() - 250),
            heartbeatAt: new Date(createdAt.getTime() - 250),
            lockOwner: uuidv7(),
            lockToken: uuidv7(),
          })
        } else if (category === 'missing-event') {
          histories.push({
            _id: uuidv7(),
            deliveryId,
            eventId,
            consumerGroup,
            topic,
            attempt: 1,
            status: 'pending',
            createdAt,
            nextAttemptAt: createdAt,
          })
        }

        if (
          category === 'no-history' ||
          category === 'error-before-retry' ||
          category === 'expired-active-lock'
        ) {
          expectedCallbacks.set(eventId, category === 'no-history' ? 1 : 2)
        }
      }
    }

    await db.collection('orionjs.pulse.events').insertMany(events)
    await db.collection('orionjs.pulse.deliveries').insertMany(deliveries)
    await db.collection('orionjs.pulse.history').insertMany(histories)

    const callbackCounts = new Map<string, number>()
    const callbackAttempts = new Map<string, number>()
    const options = {
      ordered: false,
      offsetReset: 'earliest' as const,
      maxRetries: 3,
      retryDelayMs: 0,
      maxConcurrency: 3,
    }
    await Promise.all(
      replicas.map(replica =>
        replica.subscribe(
          topic,
          async event => {
            callbackCounts.set(event.id, (callbackCounts.get(event.id) ?? 0) + 1)
            callbackAttempts.set(event.id, event.attempt)
          },
          options,
        ),
      ),
    )

    try {
      await waitFor(
        async () =>
          (await db.collection('orionjs.pulse.deliveries').countDocuments({
            consumerGroup,
            topic,
            status: 'pending',
          })) === 0,
        {timeoutMs: 20_000},
      )
    } catch (error) {
      const deliveryStatuses = await db
        .collection('orionjs.pulse.deliveries')
        .aggregate([{$group: {_id: '$status', count: {$sum: 1}}}])
        .toArray()
      const historyStatuses = await db
        .collection('orionjs.pulse.history')
        .aggregate([{$group: {_id: {status: '$status', code: '$error.code'}, count: {$sum: 1}}}])
        .toArray()
      throw new Error(
        `Mixed torn states stalled. Deliveries=${JSON.stringify(deliveryStatuses)}, ` +
          `history=${JSON.stringify(historyStatuses)}.`,
        {cause: error},
      )
    }
    await new Promise(resolve => setTimeout(resolve, 250))

    expect(callbackCounts.size).toBe(expectedCallbacks.size)
    expect([...callbackCounts.values()].every(count => count === 1)).toBe(true)
    for (const [eventId, attempt] of expectedCallbacks) {
      expect(callbackAttempts.get(eventId)).toBe(attempt)
    }
    for (const [eventId, category] of categoryByEvent) {
      if (
        category === 'success-before-delivery' ||
        category === 'exhausted-error' ||
        category === 'missing-event'
      ) {
        expect(callbackCounts.has(eventId)).toBe(false)
      }
    }
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        topic,
        status: 'success',
      }),
    ).toBe(32)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        topic,
        status: 'error',
      }),
    ).toBe(16)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        consumerGroup,
        topic,
        'error.code': 'worker_lost',
      }),
    ).toBe(8)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        consumerGroup,
        topic,
        'error.code': 'event_expired',
      }),
    ).toBe(8)
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
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    })
    await db.collection('orionjs.pulse.history').insertOne({
      _id: uuidv7(),
      deliveryId,
      eventId,
      consumerGroup,
      topic,
      attempt: 1,
      status: 'pending',
      createdAt,
      nextAttemptAt: createdAt,
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
      return delivery?.status === 'error'
    })
    const delivery = await db.collection('orionjs.pulse.deliveries').findOne({_id: deliveryId})
    const histories = await db.collection('orionjs.pulse.history').find({deliveryId}).toArray()

    expect(calls).toBe(0)
    expect(histories).toHaveLength(1)
    expect(histories[0].error.code).toBe('event_expired')
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
      ordered: true,
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
      status: 'pending',
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

    const deliveryId = uuidv7()
    await db.collection('orionjs.pulse.history').insertOne({
      _id: uuidv7(),
      deliveryId,
      eventId: 'event-1',
      consumerGroup: 'duplicate-group',
      topic: 'duplicate.topic',
      attempt: 1,
      status: 'pending',
      createdAt,
      nextAttemptAt: createdAt,
    })
    await expect(
      db.collection('orionjs.pulse.history').insertOne({
        _id: uuidv7(),
        deliveryId,
        attempt: 1,
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
          ordered: false,
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
          ordered: false,
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
      const historyStatuses = await db
        .collection('orionjs.pulse.history')
        .aggregate([{$group: {_id: '$status', count: {$sum: 1}}}])
        .toArray()
      throw new Error(
        `Burst stalled with ${calls.size}/${events.length} callbacks. ` +
          `Deliveries=${JSON.stringify(deliveryStatuses)}, ` +
          `history=${JSON.stringify(historyStatuses)}.`,
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
        status: 'success',
      }),
    ).toBe(100)
    expect(
      await db.collection('orionjs.pulse.history').countDocuments({
        consumerGroup,
        topic: 'burst.topic',
        status: 'success',
      }),
    ).toBe(100)
  })

  it('drains many ordered and concurrent topics through one poll per replica', async () => {
    const databaseName = uniqueName('multi_topic_poll')
    const consumerGroup = 'multi-topic-poll-group'
    const topics = Array.from({length: 12}, (_, index) => `multi-topic.${index}`)
    const replicas = Array.from({length: 6}, () =>
      createPulse(databaseName, consumerGroup, {
        workerCount: 4,
        pollIntervalMs: 10,
        lockTimeoutMs: 500,
        discoveryLockTimeoutMs: 200,
      }),
    )
    await Promise.all(replicas.map(replica => replica.awaitConnection()))

    const calls = new Map<string, number>()
    await Promise.all(
      replicas.flatMap(replica =>
        topics.map((topic, index) =>
          replica.subscribe(
            topic,
            async event => {
              calls.set(event.id, (calls.get(event.id) ?? 0) + 1)
            },
            {
              ordered: index % 2 === 0,
              offsetReset: 'latest',
              maxConcurrency: 2,
            },
          ),
        ),
      ),
    )

    const events = await Promise.all(
      Array.from({length: 240}, (_, index) =>
        replicas[index % replicas.length].publish({
          topic: topics[index % topics.length],
          data: {index},
        }),
      ),
    )
    await waitFor(() => calls.size === events.length, {timeoutMs: 30_000})
    await new Promise(resolve => setTimeout(resolve, 250))

    expect([...calls.values()].every(count => count === 1)).toBe(true)
    const db = await rawDatabase(databaseName)
    expect(
      await db.collection('orionjs.pulse.subscriptions').countDocuments({
        consumerGroup,
        discoveryLockedUntil: {$gt: new Date()},
      }),
    ).toBe(topics.length)
    expect(
      await db.collection('orionjs.pulse.deliveries').countDocuments({
        consumerGroup,
        status: 'success',
      }),
    ).toBe(events.length)
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
        {ordered: false, offsetReset: 'earliest', maxConcurrency: 8},
      ),
      pulse.subscribe(
        lastTopic,
        async () => {
          firstCountWhenLastArrived = firstReceived
        },
        {ordered: false, offsetReset: 'earliest', maxConcurrency: 8},
      ),
    ])

    await waitFor(() => Number.isFinite(firstCountWhenLastArrived))
    expect(firstCountWhenLastArrived).toBeLessThanOrEqual(100)
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
      first.subscribe('disjoint.first', async event => void received.add(event.id), {
        ordered: false,
      }),
      second.subscribe('disjoint.second', async event => void received.add(event.id), {
        ordered: false,
      }),
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
      ordered: false,
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
          {ordered: false, maxConcurrency: 4},
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
    await pulse.subscribe(topic, async () => {}, {ordered: false})
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
      ordered: false,
      maxConcurrency: 3,
    })
    const runtime = getRuntimeState(pulse)
    await waitFor(() => runtime.discoveryLeases.has(topic))
    runtime.running = false
    runtime.wakeCoordinator()
    await runtime.coordinatorPromise

    await Promise.all(Array.from({length: 3}, (_, index) => pulse.publish({topic, data: {index}})))
    await runtime.discoverEvents(true)
    const originalClaim = runtime.collections.history.findOneAndUpdate.bind(
      runtime.collections.history,
    )
    let claims = 0
    runtime.collections.history.findOneAndUpdate = (...args: any[]) => {
      if (args[0]?.lockToken?.$exists === false && args[1]?.$set?.lockToken) {
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
      await db.collection('orionjs.pulse.history').countDocuments({
        consumerGroup,
        topic,
        status: 'pending',
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
          ordered: false,
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
          {ordered: false, maxConcurrency: 1},
        ),
      ),
    )

    let claimAttempts = 0
    for (const runtime of replicas.map(getRuntimeState)) {
      const original = runtime.collections.history.findOneAndUpdate.bind(
        runtime.collections.history,
      )
      runtime.collections.history.findOneAndUpdate = (...args: any[]) => {
        if (args[0]?.lockToken?.$exists === false && args[1]?.$set?.lockToken) claimAttempts++
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
            ordered: false,
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
        status: 'success',
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
      {ordered: true, offsetReset: 'latest'},
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
      {ordered: true, offsetReset: 'latest'},
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
      ordered: false,
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
      ordered: false,
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

  it('executes sequenced ordered events by MongoDB order instead of publisher clocks', async () => {
    const databaseName = uniqueName('sequence_execution_order')
    const consumerGroup = 'sequence-execution-order-group'
    const topic = 'sequence-execution-order.topic'
    const pulse = createPulse(databaseName, consumerGroup)
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const first = {
      _id: uuidv7(),
      topic,
      data: {order: 1},
      createdAt: new Date(Date.now() + 60_000),
      sequence: new Timestamp({t: 30, i: 1}),
    }
    const second = {
      _id: uuidv7(),
      topic,
      data: {order: 2},
      createdAt: new Date(Date.now() - 60_000),
      sequence: new Timestamp({t: 30, i: 2}),
    }
    await db.collection<any>('orionjs.pulse.events').insertMany([first, second])

    const received: number[] = []
    await pulse.subscribe(
      topic,
      async event => {
        received.push((event.data as {order: number}).order)
      },
      {ordered: true, offsetReset: 'earliest'},
    )
    await waitFor(() => received.length === 2)
    expect(received).toEqual([1, 2])
  })

  it('preserves deterministic ordered delivery when timestamps collide', async () => {
    const databaseName = uniqueName('same_timestamp')
    const consumerGroup = 'same-timestamp-group'
    const topic = 'same-timestamp.topic'
    const pulse = createPulse(databaseName, consumerGroup, {workerCount: 4})
    await pulse.awaitConnection()
    const db = await rawDatabase(databaseName)
    const createdAt = new Date()
    const documents = Array.from({length: 40}, (_, index) => ({
      _id: uuidv7(),
      topic,
      data: {index},
      createdAt,
    }))
    await db.collection('orionjs.pulse.events').insertMany(documents)
    const expected = [...documents]
      .sort((left, right) => left._id.localeCompare(right._id))
      .map(document => document.data.index)

    const received: number[] = []
    await pulse.subscribe(
      topic,
      async event => {
        received.push((event.data as {index: number}).index)
      },
      {ordered: true, offsetReset: 'earliest'},
    )

    await waitFor(() => received.length === documents.length)
    expect(received).toEqual(expected)
  })
})
