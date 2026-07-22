import {afterAll, afterEach, beforeAll, describe, expect, it, setDefaultTimeout} from 'bun:test'
import {type ChildProcess, spawn} from 'node:child_process'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {MongoClient} from 'mongodb'
import {MongoMemoryReplSet, MongoMemoryServer} from 'mongodb-memory-server'
import {uuidv7} from 'uuidv7'
import {connect, type Pulse, PulseIndexError} from './index'

setDefaultTimeout(60_000)

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

let standalone: MongoMemoryServer
let replicaSet: MongoMemoryReplSet
const pulseClients: Array<Pulse<any>> = []
const mongoClients: MongoClient[] = []
const childProcesses = new Set<ChildProcess>()

function uniqueName(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
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
  useReplicaSet = false,
) {
  const pulse = connect({
    connectionString: useReplicaSet
      ? replicaSet.getUri(databaseName)
      : standalone.getUri(databaseName),
    databaseName,
    consumerGroup,
    changeStreams: useReplicaSet ? 'auto' : 'disabled',
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

async function rawDatabase(databaseName: string, useReplicaSet = false) {
  const client = new MongoClient(
    useReplicaSet ? replicaSet.getUri(databaseName) : standalone.getUri(databaseName),
  )
  mongoClients.push(client)
  await client.connect()
  return client.db(databaseName)
}

beforeAll(async () => {
  standalone = await MongoMemoryServer.create({
    instance: {args: ['--setParameter', 'ttlMonitorSleepSecs=1']},
  })
  replicaSet = await MongoMemoryReplSet.create({
    replSet: {count: 1},
    instanceOpts: [{args: ['--setParameter', 'ttlMonitorSleepSecs=1']}],
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
  await replicaSet?.stop()
  await standalone?.stop()
})

describe('Pulse persistence', () => {
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

    await db.collection('orionjs.pulse.history').dropIndex('pulse_history_event')
    const reconnect = createPulse(databaseName, 'index-group')
    await reconnect.awaitConnection()
    const recreated = await db.collection('orionjs.pulse.history').listIndexes().toArray()
    expect(recreated.some(index => index.name === 'pulse_history_event')).toBe(true)
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
  it('delivers once per consumer group while replicas compete through Change Streams', async () => {
    const databaseName = uniqueName('groups')
    const replicaA = createPulse(databaseName, 'group-a', {}, true)
    const replicaB = createPulse(databaseName, 'group-a', {}, true)
    const otherGroup = createPulse(databaseName, 'group-b', {}, true)
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
