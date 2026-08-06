import {afterAll, beforeAll, describe, expect, it, setDefaultTimeout} from 'bun:test'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {MongoClient} from 'mongodb'
import {MongoMemoryReplSet, MongoMemoryServer} from 'mongodb-memory-server'
import {uuidv7} from 'uuidv7'
import {DashboardRepository} from './repository'
import {
  type DashboardServer,
  DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS,
  dashboardMongoClientOptions,
  startDashboardServer,
} from './server'

setDefaultTimeout(30_000)

let memoryServer: MongoMemoryServer
let dashboard: DashboardServer
let mongoClient: MongoClient
let staticDirectory: string

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create()
  const databaseName = 'pulse_dashboard_test'
  mongoClient = new MongoClient(memoryServer.getUri(databaseName))
  await mongoClient.connect()
  const db = mongoClient.db(databaseName)
  const prefix = 'orionjs.pulse'
  const createdAt = new Date(Date.now() - 5_000)
  const eventId = uuidv7()
  const deliveryId = uuidv7()

  await db.collection<any>(`${prefix}.events`).insertOne({
    _id: eventId,
    topic: 'order.created',
    data: {orderId: 'order-42'},
    headers: {source: 'checkout'},
    createdAt,
  })
  await db.collection<any>(`${prefix}.subscriptions`).insertOne({
    _id: uuidv7(),
    consumerGroup: 'billing',
    topic: 'order.created',
    ordered: true,
    offsetReset: 'earliest',
    delivery: 'at-least-once',
    maxRetries: 3,
    retryDelayMs: 1_000,
    retryBackoffMultiplier: 2,
    createdAt,
    updatedAt: createdAt,
    cursorCreatedAt: createdAt,
    discoveryLockOwner: uuidv7(),
    discoveryLockToken: uuidv7(),
    discoveryLockedUntil: new Date(Date.now() + 60_000),
  })
  await db.collection<any>(`${prefix}.deliveries`).insertOne({
    _id: deliveryId,
    eventId,
    consumerGroup: 'billing',
    topic: 'order.created',
    eventCreatedAt: createdAt,
    status: 'error',
    createdAt,
    updatedAt: createdAt,
    endedAt: createdAt,
  })
  await db.collection<any>(`${prefix}.history`).insertOne({
    _id: uuidv7(),
    deliveryId,
    eventId,
    consumerGroup: 'billing',
    topic: 'order.created',
    attempt: 1,
    status: 'error',
    createdAt,
    nextAttemptAt: createdAt,
    startedAt: createdAt,
    endedAt: createdAt,
    durationMs: 25,
    error: {code: 'handler_error', name: 'Error', message: 'Payment provider unavailable'},
  })

  staticDirectory = mkdtempSync(join(tmpdir(), 'pulse-dashboard-static-'))
  writeFileSync(join(staticDirectory, 'index.html'), '<h1>Pulse dashboard fixture</h1>')
  dashboard = await startDashboardServer({
    connectionString: memoryServer.getUri(databaseName),
    databaseName,
    port: 0,
    openBrowser: false,
    staticDirectory,
  })
})

afterAll(async () => {
  await dashboard?.close()
  await mongoClient?.close()
  await memoryServer?.stop()
  if (staticDirectory) rmSync(staticDirectory, {recursive: true, force: true})
})

describe('Pulse dashboard server', () => {
  it('serves read-only monitoring data directly from MongoDB', async () => {
    const healthResponse = await fetch(`${dashboard.url}/api/health`)
    const health = await healthResponse.json()
    expect(healthResponse.status).toBe(200)
    expect(health.data.database).toBe('pulse_dashboard_test')

    const overviewResponse = await fetch(`${dashboard.url}/api/overview?range=24h`)
    const overview = await overviewResponse.json()
    expect(overview.data.totals.events).toBe(1)
    expect(overview.data.totals.subscriptions).toBe(1)
    expect(overview.data.deliveryStatus.error).toBe(1)
    expect(overview.data.recentErrors[0].error.code).toBe('handler_error')
    expect(overview.data.topics[0].topic).toBe('order.created')

    const deliveriesResponse = await fetch(`${dashboard.url}/api/deliveries?status=error`)
    const deliveries = await deliveriesResponse.json()
    expect(deliveries.data.pagination.total).toBe(1)
    expect(deliveries.data.items[0].event.data.orderId).toBe('order-42')

    const eventsResponse = await fetch(`${dashboard.url}/api/events`)
    const events = await eventsResponse.json()
    expect(events.data.items[0].deliveries.error).toBe(1)

    const subscriptionsResponse = await fetch(`${dashboard.url}/api/subscriptions`)
    const subscriptions = await subscriptionsResponse.json()
    expect(subscriptions.data.items[0].consumerGroup).toBe('billing')
    expect(subscriptions.data.items[0].discoveryLease).toBe('active')
    expect(subscriptions.data.items[0].orderedLease).toBe('idle')
  })

  it('rejects mutations and hosts the compiled application shell', async () => {
    const db = mongoClient.db('pulse_dashboard_test')
    const before = await db.collection('orionjs.pulse.events').countDocuments()
    const mutation = await fetch(`${dashboard.url}/api/events`, {method: 'POST'})
    expect(mutation.status).toBe(405)
    expect((await mutation.json()).error).toContain('read-only')
    expect(await db.collection('orionjs.pulse.events').countDocuments()).toBe(before)

    const application = await fetch(dashboard.url)
    expect(application.status).toBe(200)
    expect(await application.text()).toContain('Pulse dashboard fixture')
  })

  it('prefers secondaries and applies maxTimeMS to every dashboard read command', async () => {
    const queryTimeoutMs = 1_234
    const clientOptions = dashboardMongoClientOptions(queryTimeoutMs)
    expect(clientOptions).toMatchObject({
      readPreference: 'secondaryPreferred',
      timeoutMS: queryTimeoutMs,
      serverSelectionTimeoutMS: queryTimeoutMs,
      connectTimeoutMS: queryTimeoutMs,
      socketTimeoutMS: queryTimeoutMs,
      waitQueueTimeoutMS: queryTimeoutMs,
    })
    expect(dashboardMongoClientOptions(DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS).readPreference).toBe(
      'secondaryPreferred',
    )
    expect(DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS).toBe(30_000)

    const monitoredClient = new MongoClient(memoryServer.getUri('pulse_dashboard_test'), {
      ...clientOptions,
      monitorCommands: true,
    })
    const commands: Array<Record<string, unknown>> = []
    monitoredClient.on('commandStarted', event => {
      if (
        event.commandName === 'aggregate' ||
        event.commandName === 'count' ||
        event.commandName === 'find'
      ) {
        commands.push(event.command)
      }
    })
    await monitoredClient.connect()
    try {
      const repository = new DashboardRepository(
        monitoredClient.db('pulse_dashboard_test', {readPreference: 'secondaryPreferred'}),
        'orionjs.pulse',
        queryTimeoutMs,
      )
      const query = {page: 1, limit: 25}
      await repository.overview('1h')
      await repository.deliveries(query)
      await repository.history(query)
      await repository.events(query)
      await repository.subscriptions(query)

      expect(commands.length).toBeGreaterThan(0)
      for (const command of commands) {
        expect(typeof command.maxTimeMS).toBe('number')
        expect(command.maxTimeMS as number).toBeGreaterThan(0)
        expect(command.maxTimeMS as number).toBeLessThanOrEqual(queryTimeoutMs)
      }
    } finally {
      await monitoredClient.close()
    }
  })

  it('rejects an invalid dashboard query timeout before connecting', async () => {
    await expect(
      startDashboardServer({
        connectionString: memoryServer.getUri('pulse_dashboard_test'),
        queryTimeoutMs: 0,
        openBrowser: false,
      }),
    ).rejects.toThrow('Dashboard query timeout must be a positive integer.')
  })

  it('routes dashboard reads to secondaries when a replica set has one available', async () => {
    const replicaSet = await MongoMemoryReplSet.create({replSet: {count: 3}})
    const uri = replicaSet.getUri('pulse_dashboard_secondary_test')
    const topologyClient = new MongoClient(uri)
    const readAddresses: string[] = []
    const readClient = new MongoClient(uri, {
      ...dashboardMongoClientOptions(5_000),
      monitorCommands: true,
    })
    readClient.on('commandStarted', event => {
      if (event.commandName === 'aggregate' || event.commandName === 'find') {
        readAddresses.push(event.address)
      }
    })

    try {
      await topologyClient.connect()
      const hello = await topologyClient.db('admin').command({hello: 1})
      await topologyClient
        .db('pulse_dashboard_secondary_test')
        .collection<any>('orionjs.pulse.subscriptions')
        .insertOne(
          {_id: uuidv7(), topic: 'secondary.test', consumerGroup: 'secondary-test'},
          {writeConcern: {w: 'majority'}},
        )
      await readClient.connect()
      await readClient
        .db('pulse_dashboard_secondary_test')
        .collection('orionjs.pulse.subscriptions')
        .findOne({}, {readPreference: 'secondary', maxTimeMS: 5_000})
      readAddresses.length = 0
      const repository = new DashboardRepository(
        readClient.db('pulse_dashboard_secondary_test', {
          readPreference: 'secondaryPreferred',
        }),
        'orionjs.pulse',
        5_000,
      )
      await repository.subscriptions({page: 1, limit: 25})

      expect(readAddresses.length).toBeGreaterThan(0)
      expect(readAddresses.every(address => address !== hello.primary)).toBe(true)
    } finally {
      await Promise.allSettled([topologyClient.close(), readClient.close()])
      await replicaSet.stop()
    }
  })
})
