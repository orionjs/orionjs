import {expect, it, setDefaultTimeout} from 'bun:test'

const stressTest = process.env.DOGS_RUN_STRESS_TEST === '1' ? it : it.skip

setDefaultTimeout(Number(process.env.DOGS_STRESS_TIMEOUT_MS || 15 * 60 * 1000))

stressTest('bulk schedules partitioned jobs idempotently under heavy concurrency', async () => {
  const uniqueJobs = Number(process.env.DOGS_STRESS_JOBS || 10_000)
  const concurrentSchedulers = Number(process.env.DOGS_STRESS_SCHEDULERS || 8)
  const nPartitions = Number(process.env.DOGS_STRESS_PARTITIONS || 30)
  const baseMongoUrl = process.env.DOGS_STRESS_MONGO_URL || 'mongodb://127.0.0.1:3003'
  const databaseName = `orionjs_dogs_bulk_stress_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`
  const mongoUrl = new URL(baseMongoUrl)

  if (!['127.0.0.1', 'localhost', '::1'].includes(mongoUrl.hostname)) {
    throw new Error('The Dogs bulk scheduling stress test only runs against local MongoDB.')
  }

  mongoUrl.pathname = `/${databaseName}`
  if (!mongoUrl.searchParams.has('directConnection')) {
    mongoUrl.searchParams.set('directConnection', 'true')
  }
  process.env.MONGO_URL = mongoUrl.toString()

  const {connections} = await import('@orion-js/mongodb')
  const {getInstance} = await import('@orion-js/services')
  const {createEventJob} = await import('../src/defineJob')
  const {JobsRepo} = await import('../src/repos/JobsRepo')

  const jobsRepo = getInstance(JobsRepo)
  const rawCollection = await jobsRepo.jobs.getRawCollection()
  const job = createEventJob({
    params: {documentQueueItemId: {type: 'string'}},
    resolve: async () => {},
  })
  job.jobName = 'bulk-stress-job'
  job.nPartitions = nPartitions

  const startedAt = performance.now()

  try {
    await jobsRepo.jobs.createIndexesPromise
    const results = await Promise.all(
      Array.from({length: concurrentSchedulers}, () =>
        job.scheduleJobs(
          Array.from({length: uniqueJobs}, (_, index) => ({
            params: {documentQueueItemId: `document-${index}`},
            priority: 40,
            uniqueIdentifier: `bulk-stress-job-document-${index}`,
          })),
        ),
      ),
    )

    const elapsedMs = performance.now() - startedAt
    const records = await rawCollection.find({jobName: job.jobName}).toArray()
    const scheduledCount = results.reduce((total, result) => total + result.scheduledCount, 0)
    const skippedCount = results.reduce((total, result) => total + result.skippedCount, 0)
    const errors = results.flatMap(result => result.errors)

    expect(scheduledCount).toBe(uniqueJobs)
    expect(skippedCount).toBe(uniqueJobs * (concurrentSchedulers - 1))
    expect(errors).toHaveLength(0)
    expect(records).toHaveLength(uniqueJobs)
    expect(records.every(record => record.partition >= 0 && record.partition < nPartitions)).toBe(
      true,
    )
    expect(new Set(records.map(record => record.uniqueIdentifier)).size).toBe(uniqueJobs)

    console.log(
      JSON.stringify(
        {
          databaseName,
          uniqueJobs,
          attemptedSchedules: uniqueJobs * concurrentSchedulers,
          concurrentSchedulers,
          nPartitions,
          elapsedMs: Math.round(elapsedMs),
          attemptedSchedulesPerSecond: Math.round(
            ((uniqueJobs * concurrentSchedulers) / elapsedMs) * 1000,
          ),
          scheduledCount,
          skippedCount,
          errors: errors.length,
        },
        null,
        2,
      ),
    )
  } finally {
    await rawCollection.db.dropDatabase()
    for (const connection of Object.values(connections)) {
      await connection.closeConnection()
    }
  }
})
