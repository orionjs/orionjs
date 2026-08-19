import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {MongoClient} from 'mongodb'
import {MongoMemoryReplSet} from 'mongodb-memory-server'
import {connect, type Pulse, type PulseReceivedEvent} from '../src'

type StressPayload = {
  scenario: string
  index: number
}

type StressEvents = Record<string, StressPayload>

type Tracker = {
  seen: Set<string>
  duplicates: number
  invocations: number
  batchSizes: number[]
  active: number
  maxActive: number
}

type ScenarioMetrics = {
  scenario: string
  events: number
  publishMs: number
  drainMs: number
  eventsPerSecond: number
  invocations: number
  batchSize: {
    min: number
    average: number
    p50: number
    p95: number
    max: number
  }
  maxActiveInvocations: number
  duplicateSuccessfulEvents: number
  deliveryStatuses: Record<string, number>
  deliveryStorageBytes: number
  rssBeforeMb: number
  peakRssMb: number
  rssAfterMb: number
  errors: string[]
}

const EVENT_COUNT = {
  batch: 30_000,
  mixed: 15_000,
  retry: 15_000,
  saturation: 6_400,
  fairness: 3_600,
}
const PREFIX = 'orionjs.pulse'
const TIMEOUT_MS = 180_000

function createTracker(): Tracker {
  return {
    seen: new Set(),
    duplicates: 0,
    invocations: 0,
    batchSizes: [],
    active: 0,
    maxActive: 0,
  }
}

function beginInvocation(tracker: Tracker, events: PulseReceivedEvent<string, StressPayload>[]) {
  tracker.invocations += 1
  tracker.batchSizes.push(events.length)
  tracker.active += 1
  tracker.maxActive = Math.max(tracker.maxActive, tracker.active)
}

function recordSuccessfulEvents(
  tracker: Tracker,
  events: PulseReceivedEvent<string, StressPayload>[],
) {
  for (const event of events) {
    if (tracker.seen.has(event.id)) tracker.duplicates += 1
    tracker.seen.add(event.id)
  }
}

function endInvocation(tracker: Tracker) {
  tracker.active -= 1
}

function percentile(values: number[], requested: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * requested) - 1)]
}

function summarizeBatchSizes(values: number[]) {
  if (values.length === 0) return {min: 0, average: 0, p50: 0, p95: 0, max: 0}
  return {
    min: Math.min(...values),
    average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: Math.max(...values),
  }
}

function mb(bytes: number) {
  return Number((bytes / 1024 / 1024).toFixed(2))
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitUntil(description: string, check: () => Promise<boolean> | boolean) {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await check()) return
    await delay(20)
  }
  throw new Error(`Timed out waiting for ${description}.`)
}

async function closeAll(instances: Pulse<StressEvents>[]) {
  await Promise.allSettled(instances.map(instance => instance.close()))
}

async function publishEvents(
  uri: string,
  databaseName: string,
  topic: string,
  scenario: string,
  count: number,
) {
  const publisher = connect<StressEvents>({
    connectionString: uri,
    databaseName,
    consumerGroup: `${scenario}-publisher`,
    eventRetentionMs: null,
    historyRetentionMs: null,
    pollIntervalMs: 5,
    workerCount: 1,
    maxPoolSize: 16,
  })
  await publisher.awaitConnection()
  const startedAt = performance.now()
  try {
    const concurrency = 200
    for (let start = 0; start < count; start += concurrency) {
      await Promise.all(
        Array.from({length: Math.min(concurrency, count - start)}, (_, offset) =>
          publisher.publish({
            topic,
            data: {scenario, index: start + offset},
          }),
        ),
      )
    }
  } finally {
    await publisher.close()
  }
  return performance.now() - startedAt
}

async function publishAcrossTopics(
  uri: string,
  databaseName: string,
  topics: string[],
  scenario: string,
  countPerTopic: number,
) {
  const publisher = connect<StressEvents>({
    connectionString: uri,
    databaseName,
    consumerGroup: `${scenario}-publisher`,
    eventRetentionMs: null,
    historyRetentionMs: null,
    pollIntervalMs: 5,
    workerCount: 1,
    maxPoolSize: 16,
  })
  await publisher.awaitConnection()
  const startedAt = performance.now()
  try {
    for (let start = 0; start < countPerTopic; start += 20) {
      const count = Math.min(20, countPerTopic - start)
      await Promise.all(
        topics.flatMap(topic =>
          Array.from({length: count}, (_, offset) =>
            publisher.publish({
              topic,
              data: {scenario, index: start + offset},
            }),
          ),
        ),
      )
    }
  } finally {
    await publisher.close()
  }
  return performance.now() - startedAt
}

function createConsumer(
  uri: string,
  databaseName: string,
  consumerGroup: string,
  errors: string[],
  workerCount = 8,
) {
  return connect<StressEvents>({
    connectionString: uri,
    databaseName,
    consumerGroup,
    eventRetentionMs: null,
    historyRetentionMs: null,
    pollIntervalMs: 5,
    workerCount,
    maxPoolSize: 1,
    lockTimeoutMs: 3_000,
    discoveryLockTimeoutMs: 2_000,
    onError(error) {
      errors.push(`${error.name}: ${error.message}`)
    },
  })
}

async function deliveryStatusCounts(
  client: MongoClient,
  databaseName: string,
  consumerGroup: string,
  topic: string,
) {
  const rows = await client
    .db(databaseName)
    .collection(`${PREFIX}.deliveries`)
    .aggregate<{_id: string; count: number}>([
      {$match: {consumerGroup, topic}},
      {$group: {_id: '$status', count: {$sum: 1}}},
    ])
    .toArray()
  return Object.fromEntries(rows.map(row => [row._id, row.count]))
}

async function waitForDrain(
  client: MongoClient,
  databaseName: string,
  consumerGroup: string,
  topic: string,
  tracker: Tracker,
  expectedEvents: number,
) {
  const deliveries = client.db(databaseName).collection(`${PREFIX}.deliveries`)
  await waitUntil(`${expectedEvents} successful events and all acknowledgements`, async () => {
    if (tracker.seen.size !== expectedEvents) return false
    const unfinished = await deliveries.countDocuments({
      consumerGroup,
      topic,
      status: {$in: ['v2-pending', 'v2-processing']},
    })
    return unfinished === 0
  })
}

async function collectMetrics(
  client: MongoClient,
  databaseName: string,
  consumerGroup: string,
  topic: string,
  scenario: string,
  count: number,
  publishMs: number,
  drainMs: number,
  tracker: Tracker,
  errors: string[],
  rssBefore: number,
  peakRss: number,
): Promise<ScenarioMetrics> {
  const stats = await client.db(databaseName).command({collStats: `${PREFIX}.deliveries`})
  return {
    scenario,
    events: count,
    publishMs: Math.round(publishMs),
    drainMs: Math.round(drainMs),
    eventsPerSecond: Math.round((count * 1_000) / drainMs),
    invocations: tracker.invocations,
    batchSize: summarizeBatchSizes(tracker.batchSizes),
    maxActiveInvocations: tracker.maxActive,
    duplicateSuccessfulEvents: tracker.duplicates,
    deliveryStatuses: await deliveryStatusCounts(client, databaseName, consumerGroup, topic),
    deliveryStorageBytes: Number(stats.storageSize ?? 0),
    rssBeforeMb: mb(rssBefore),
    peakRssMb: mb(peakRss),
    rssAfterMb: mb(process.memoryUsage().rss),
    errors,
  }
}

async function runMeasuredScenario<TResult>(
  run: (observeRss: (rss: number) => void) => Promise<TResult>,
) {
  let peakRss = process.memoryUsage().rss
  const interval = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss)
  }, 25)
  try {
    return await run(rss => {
      peakRss = Math.max(peakRss, rss)
    })
  } finally {
    clearInterval(interval)
  }
}

async function runBatchThroughput(uri: string, adminClient: MongoClient) {
  const scenario = 'batch-throughput'
  const databaseName = 'pulse_stress_batch'
  const topic = 'stress.batch'
  const consumerGroup = 'stress-batch-consumers'
  const count = EVENT_COUNT.batch
  const tracker = createTracker()
  const errors: string[] = []
  const consumers: Pulse<StressEvents>[] = []
  const rssBefore = process.memoryUsage().rss
  let peakRss = rssBefore

  const publishMs = await publishEvents(uri, databaseName, topic, scenario, count)
  for (let index = 0; index < 4; index += 1) {
    consumers.push(createConsumer(uri, databaseName, consumerGroup, errors))
  }

  const startedAt = performance.now()
  try {
    await Promise.all(
      consumers.map(consumer =>
        consumer.subscribeBatch(
          topic,
          async events => {
            beginInvocation(tracker, events)
            try {
              await delay(2)
              recordSuccessfulEvents(tracker, events)
            } finally {
              endInvocation(tracker)
              peakRss = Math.max(peakRss, process.memoryUsage().rss)
            }
          },
          {
            batchSize: 100,
            configVersion: 1,
            offsetReset: 'earliest',
            maxConcurrency: 8,
          },
        ),
      ),
    )
    await waitForDrain(adminClient, databaseName, consumerGroup, topic, tracker, count)
    const drainMs = performance.now() - startedAt

    assert.equal(tracker.seen.size, count)
    assert.equal(tracker.duplicates, 0)
    assert.equal(errors.length, 0)
    return await collectMetrics(
      adminClient,
      databaseName,
      consumerGroup,
      topic,
      scenario,
      count,
      publishMs,
      drainMs,
      tracker,
      errors,
      rssBefore,
      peakRss,
    )
  } finally {
    await closeAll(consumers)
  }
}

async function runMixedRollout(uri: string, adminClient: MongoClient) {
  const scenario = 'mixed-batch-single-rollout'
  const databaseName = 'pulse_stress_mixed'
  const topic = 'stress.mixed'
  const consumerGroup = 'stress-mixed-consumers'
  const count = EVENT_COUNT.mixed
  const tracker = createTracker()
  const errors: string[] = []
  const consumers: Pulse<StressEvents>[] = []
  const handledBy = {batch: 0, single: 0}
  const rssBefore = process.memoryUsage().rss
  let peakRss = rssBefore

  const publishMs = await publishEvents(uri, databaseName, topic, scenario, count)
  const firstBatch = createConsumer(uri, databaseName, consumerGroup, errors, 2)
  consumers.push(firstBatch)
  const startedAt = performance.now()
  try {
    await firstBatch.subscribeBatch(
      topic,
      async events => {
        beginInvocation(tracker, events)
        try {
          await delay(3)
          handledBy.batch += events.length
          recordSuccessfulEvents(tracker, events)
        } finally {
          endInvocation(tracker)
        }
      },
      {
        batchSize: 100,
        configVersion: 10,
        offsetReset: 'earliest',
        maxConcurrency: 2,
      },
    )

    const additionalBatch = createConsumer(uri, databaseName, consumerGroup, errors, 6)
    consumers.push(additionalBatch)
    const singles = Array.from({length: 2}, () =>
      createConsumer(uri, databaseName, consumerGroup, errors, 6),
    )
    consumers.push(...singles)

    await Promise.all([
      additionalBatch.subscribeBatch(
        topic,
        async events => {
          beginInvocation(tracker, events)
          try {
            await delay(3)
            handledBy.batch += events.length
            recordSuccessfulEvents(tracker, events)
          } finally {
            endInvocation(tracker)
          }
        },
        {
          batchSize: 100,
          configVersion: 10,
          offsetReset: 'earliest',
          maxConcurrency: 6,
        },
      ),
      ...singles.map(single =>
        single.subscribe(
          topic,
          async event => {
            beginInvocation(tracker, [event])
            try {
              handledBy.single += 1
              recordSuccessfulEvents(tracker, [event])
            } finally {
              endInvocation(tracker)
            }
          },
          {
            configVersion: 0,
            offsetReset: 'earliest',
            maxConcurrency: 6,
          },
        ),
      ),
    ])

    await waitForDrain(adminClient, databaseName, consumerGroup, topic, tracker, count)
    const drainMs = performance.now() - startedAt
    peakRss = Math.max(peakRss, process.memoryUsage().rss)

    assert.equal(tracker.seen.size, count)
    assert.equal(tracker.duplicates, 0)
    assert.ok(handledBy.batch > 0, 'Expected the batch handler to receive work.')
    assert.ok(handledBy.single > 0, 'Expected an old single handler to receive batch deliveries.')
    assert.equal(errors.length, 0)
    const metrics = await collectMetrics(
      adminClient,
      databaseName,
      consumerGroup,
      topic,
      scenario,
      count,
      publishMs,
      drainMs,
      tracker,
      errors,
      rssBefore,
      peakRss,
    )
    return {...metrics, handledBy}
  } finally {
    await closeAll(consumers)
  }
}

async function runRetryStorm(uri: string, adminClient: MongoClient) {
  const scenario = 'batch-retry-storm'
  const databaseName = 'pulse_stress_retry'
  const topic = 'stress.retry'
  const consumerGroup = 'stress-retry-consumers'
  const count = EVENT_COUNT.retry
  const tracker = createTracker()
  const errors: string[] = []
  const consumers: Pulse<StressEvents>[] = []
  const attemptedEvents = {first: 0, second: 0}
  const rssBefore = process.memoryUsage().rss
  let peakRss = rssBefore

  const publishMs = await publishEvents(uri, databaseName, topic, scenario, count)
  for (let index = 0; index < 4; index += 1) {
    consumers.push(createConsumer(uri, databaseName, consumerGroup, errors))
  }

  const startedAt = performance.now()
  try {
    await Promise.all(
      consumers.map(consumer =>
        consumer.subscribeBatch(
          topic,
          async events => {
            beginInvocation(tracker, events)
            try {
              await delay(2)
              const attempt = events[0]?.attempt
              assert.ok(attempt === 1 || attempt === 2)
              if (attempt === 1) {
                attemptedEvents.first += events.length
                throw new Error('Intentional stress-test first-attempt failure')
              }
              attemptedEvents.second += events.length
              recordSuccessfulEvents(tracker, events)
            } finally {
              endInvocation(tracker)
              peakRss = Math.max(peakRss, process.memoryUsage().rss)
            }
          },
          {
            batchSize: 100,
            configVersion: 1,
            offsetReset: 'earliest',
            maxConcurrency: 8,
            maxRetries: 1,
            retryDelayMs: 0,
          },
        ),
      ),
    )

    await waitForDrain(adminClient, databaseName, consumerGroup, topic, tracker, count)
    const drainMs = performance.now() - startedAt
    const deliveries = adminClient.db(databaseName).collection(`${PREFIX}.deliveries`)
    const malformedAttempts = await deliveries.countDocuments({
      consumerGroup,
      topic,
      $or: [
        {attempt: {$ne: 2}},
        {'attempts.0.status': {$ne: 'error'}},
        {'attempts.1.status': {$ne: 'success'}},
      ],
    })

    assert.equal(tracker.seen.size, count)
    assert.equal(tracker.duplicates, 0)
    assert.equal(attemptedEvents.first, count)
    assert.equal(attemptedEvents.second, count)
    assert.equal(malformedAttempts, 0)
    assert.equal(errors.length, 0)
    const metrics = await collectMetrics(
      adminClient,
      databaseName,
      consumerGroup,
      topic,
      scenario,
      count,
      publishMs,
      drainMs,
      tracker,
      errors,
      rssBefore,
      peakRss,
    )
    return {...metrics, attemptedEvents, malformedAttempts}
  } finally {
    await closeAll(consumers)
  }
}

async function runWorkerSaturation(uri: string, adminClient: MongoClient) {
  const scenario = 'four-worker-saturation'
  const databaseName = 'pulse_stress_saturation'
  const topic = 'stress.saturation'
  const consumerGroup = 'stress-saturation-consumers'
  const count = EVENT_COUNT.saturation
  const tracker = createTracker()
  const errors: string[] = []
  const consumer = createConsumer(uri, databaseName, consumerGroup, errors, 4)
  const rssBefore = process.memoryUsage().rss
  let peakRss = rssBefore

  const publishMs = await publishEvents(uri, databaseName, topic, scenario, count)
  const startedAt = performance.now()
  try {
    await consumer.subscribeBatch(
      topic,
      async events => {
        beginInvocation(tracker, events)
        try {
          await delay(100)
          recordSuccessfulEvents(tracker, events)
        } finally {
          endInvocation(tracker)
          peakRss = Math.max(peakRss, process.memoryUsage().rss)
        }
      },
      {
        batchSize: 100,
        configVersion: 1,
        offsetReset: 'earliest',
        maxConcurrency: 4,
      },
    )
    await waitForDrain(adminClient, databaseName, consumerGroup, topic, tracker, count)
    const drainMs = performance.now() - startedAt

    assert.equal(tracker.seen.size, count)
    assert.equal(tracker.duplicates, 0)
    assert.equal(tracker.maxActive, 4)
    assert.equal(errors.length, 0)
    return await collectMetrics(
      adminClient,
      databaseName,
      consumerGroup,
      topic,
      scenario,
      count,
      publishMs,
      drainMs,
      tracker,
      errors,
      rssBefore,
      peakRss,
    )
  } finally {
    await consumer.close()
  }
}

async function runMoreTopicsThanWorkers(uri: string, adminClient: MongoClient) {
  const scenario = 'more-topics-than-workers'
  const databaseName = 'pulse_stress_fairness'
  const consumerGroup = 'stress-fairness-consumers'
  const batchTopics = Array.from({length: 6}, (_, index) => `stress.batch.${index}`)
  const singleTopics = Array.from({length: 6}, (_, index) => `stress.single.${index}`)
  const topics = [...batchTopics, ...singleTopics]
  const countPerTopic = EVENT_COUNT.fairness / topics.length
  const tracker = createTracker()
  const errors: string[] = []
  const countsByTopic = Object.fromEntries(topics.map(topic => [topic, 0]))
  const consumer = createConsumer(uri, databaseName, consumerGroup, errors, 4)

  const publishMs = await publishAcrossTopics(uri, databaseName, topics, scenario, countPerTopic)
  let releaseGate: (() => void) | undefined
  let gateOpen = false
  const gate = new Promise<void>(resolve => {
    releaseGate = resolve
  })
  const startedAt = performance.now()
  try {
    await Promise.all([
      ...batchTopics.map(topic =>
        consumer.subscribeBatch(
          topic,
          async events => {
            beginInvocation(tracker, events)
            try {
              if (!gateOpen) await gate
              countsByTopic[topic] += events.length
              recordSuccessfulEvents(tracker, events)
            } finally {
              endInvocation(tracker)
            }
          },
          {
            batchSize: 50,
            configVersion: 1,
            offsetReset: 'earliest',
            maxConcurrency: 4,
          },
        ),
      ),
      ...singleTopics.map(topic =>
        consumer.subscribe(
          topic,
          async event => {
            beginInvocation(tracker, [event])
            try {
              if (!gateOpen) await gate
              countsByTopic[topic] += 1
              recordSuccessfulEvents(tracker, [event])
            } finally {
              endInvocation(tracker)
            }
          },
          {
            configVersion: 1,
            offsetReset: 'earliest',
            maxConcurrency: 4,
          },
        ),
      ),
    ])
    await waitUntil('all four workers to be occupied before opening the gate', () => {
      return tracker.active === 4
    })
    gateOpen = true
    releaseGate?.()

    const deliveries = adminClient.db(databaseName).collection(`${PREFIX}.deliveries`)
    await waitUntil('all topics to drain fairly', async () => {
      if (tracker.seen.size !== EVENT_COUNT.fairness) return false
      return (
        (await deliveries.countDocuments({
          consumerGroup,
          topic: {$in: topics},
          status: {$in: ['v2-pending', 'v2-processing']},
        })) === 0
      )
    })
    const drainMs = performance.now() - startedAt
    const statuses = await deliveries
      .aggregate<{_id: string; count: number}>([
        {$match: {consumerGroup, topic: {$in: topics}}},
        {$group: {_id: '$status', count: {$sum: 1}}},
      ])
      .toArray()

    assert.equal(tracker.seen.size, EVENT_COUNT.fairness)
    assert.equal(tracker.duplicates, 0)
    assert.equal(tracker.maxActive, 4)
    assert.deepEqual(new Set(Object.values(countsByTopic)), new Set([countPerTopic]))
    assert.equal(errors.length, 0)
    return {
      scenario,
      topics: topics.length,
      batchTopics: batchTopics.length,
      singleTopics: singleTopics.length,
      events: EVENT_COUNT.fairness,
      eventsPerTopic: countPerTopic,
      publishMs: Math.round(publishMs),
      drainMs: Math.round(drainMs),
      eventsPerSecond: Math.round((EVENT_COUNT.fairness * 1_000) / drainMs),
      invocations: tracker.invocations,
      handlerInputSize: summarizeBatchSizes(tracker.batchSizes),
      maxActiveInvocations: tracker.maxActive,
      duplicateSuccessfulEvents: tracker.duplicates,
      countsByTopic,
      deliveryStatuses: Object.fromEntries(statuses.map(row => [row._id, row.count])),
      errors,
    }
  } finally {
    gateOpen = true
    releaseGate?.()
    await consumer.close()
  }
}

async function dropStressDatabases(client: MongoClient) {
  for (const databaseName of [
    'pulse_stress_batch',
    'pulse_stress_mixed',
    'pulse_stress_retry',
    'pulse_stress_saturation',
    'pulse_stress_fairness',
  ]) {
    await client.db(databaseName).dropDatabase()
  }
}

async function main() {
  const replSet = await MongoMemoryReplSet.create({replSet: {count: 1}})
  const uri = replSet.getUri()
  const adminClient = new MongoClient(uri, {maxPoolSize: 20})
  await adminClient.connect()
  const totalStartedAt = performance.now()
  try {
    await dropStressDatabases(adminClient)
    const results: Array<{scenario: string; [key: string]: unknown}> = []

    results.push(await runMeasuredScenario(() => runBatchThroughput(uri, adminClient)))
    console.log(JSON.stringify(results.at(-1), null, 2))

    results.push(await runMeasuredScenario(() => runMixedRollout(uri, adminClient)))
    console.log(JSON.stringify(results.at(-1), null, 2))

    results.push(await runMeasuredScenario(() => runRetryStorm(uri, adminClient)))
    console.log(JSON.stringify(results.at(-1), null, 2))

    results.push(await runMeasuredScenario(() => runWorkerSaturation(uri, adminClient)))
    console.log(JSON.stringify(results.at(-1), null, 2))

    results.push(await runMeasuredScenario(() => runMoreTopicsThanWorkers(uri, adminClient)))
    console.log(JSON.stringify(results.at(-1), null, 2))

    console.log(
      JSON.stringify(
        {
          result: 'PASS',
          totalEvents: Object.values(EVENT_COUNT).reduce((sum, count) => sum + count, 0),
          wallClockMs: Math.round(performance.now() - totalStartedAt),
          scenarios: results.map(result => result.scenario),
        },
        null,
        2,
      ),
    )
  } finally {
    await adminClient.close()
    await replSet.stop()
  }
}

await main()
