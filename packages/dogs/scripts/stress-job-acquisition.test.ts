import {expect, it, setDefaultTimeout} from 'bun:test'

const stressTest = process.env.DOGS_RUN_STRESS_TEST === '1' ? it : it.skip

setDefaultTimeout(Number(process.env.DOGS_STRESS_TIMEOUT_MS || 15 * 60 * 1000))

stressTest('does not return duplicate claims under heavy concurrency', async () => {
  const totalJobs = Number(process.env.DOGS_STRESS_JOBS || 50_000)
  const concurrentClaimers = Number(process.env.DOGS_STRESS_CLAIMERS || 256)
  const baseMongoUrl = process.env.DOGS_STRESS_MONGO_URL || 'mongodb://127.0.0.1:3003'
  const databaseName = `orionjs_dogs_stress_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const mongoUrl = new URL(baseMongoUrl)

  if (!['127.0.0.1', 'localhost', '::1'].includes(mongoUrl.hostname)) {
    throw new Error('The Dogs acquisition stress test only runs against a local MongoDB server.')
  }

  mongoUrl.pathname = `/${databaseName}`
  if (!mongoUrl.searchParams.has('directConnection')) {
    mongoUrl.searchParams.set('directConnection', 'true')
  }
  process.env.MONGO_URL = mongoUrl.toString()

  const {connections} = await import('@orion-js/mongodb')
  const {getInstance} = await import('@orion-js/services')
  const {CANDIDATE_JOB_ACQUISITION_HINT, JobsRepo} = await import('../src/repos/JobsRepo')

  const jobsRepo = getInstance(JobsRepo)
  const rawCollection = await jobsRepo.jobs.getRawCollection()
  const admin = rawCollection.db.admin()
  const jobNames = Array.from({length: 32}, (_, index) => `stress-job-${index}`)

  async function getWriteConflicts(): Promise<number> {
    const status = await admin.command({serverStatus: 1})
    return Number(status.metrics?.operation?.writeConflicts || 0)
  }

  function shuffledPartitions(nPartitions: number) {
    const partitions = Array.from({length: nPartitions}, (_, partition) => partition)
    for (let index = partitions.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[partitions[index], partitions[swapIndex]] = [partitions[swapIndex], partitions[index]]
    }
    return partitions
  }

  async function seedJobs(nPartitions: number) {
    await rawCollection.deleteMany({})
    const firstRunAt = Date.now() - totalJobs - 60_000

    for (let start = 0; start < totalJobs; start += 1000) {
      const end = Math.min(start + 1000, totalJobs)
      await rawCollection.insertMany(
        Array.from({length: end - start}, (_, offset) => {
          const index = start + offset
          return {
            _id: `stress-job-record-${index}`,
            jobName: jobNames[index % jobNames.length],
            type: 'event',
            priority: 100,
            nextRunAt: new Date(firstRunAt + index),
            partition: index % nPartitions,
            params: {index},
          }
        }),
      )
    }
  }

  async function runScenario(label: string, sortedUpdateOne: boolean, nPartitions: number) {
    await seedJobs(nPartitions)
    ;(jobsRepo as any).sortedUpdateOneSupportPromise = Promise.resolve(sortedUpdateOne)

    const claimedJobIds: string[] = []
    const claimedExecutionIds: string[] = []
    const conflictsBefore = await getWriteConflicts()
    const startedAt = performance.now()

    await Promise.all(
      Array.from({length: concurrentClaimers}, async () => {
        let partitionOrder = shuffledPartitions(nPartitions)
        let partitionCursor = 0
        let consecutiveMisses = 0

        while (consecutiveMisses < nPartitions) {
          const partition = partitionOrder[partitionCursor]
          partitionCursor++
          if (partitionCursor === nPartitions) {
            partitionOrder = shuffledPartitions(nPartitions)
            partitionCursor = 0
          }

          const job = await jobsRepo.getJobAndLock(
            jobNames,
            30 * 60 * 1000,
            CANDIDATE_JOB_ACQUISITION_HINT,
            partition,
          )
          if (!job) {
            consecutiveMisses++
            continue
          }
          consecutiveMisses = 0
          claimedJobIds.push(job.jobId)
          claimedExecutionIds.push(job.executionId)
        }
      }),
    )

    const elapsedMs = performance.now() - startedAt
    const conflicts = (await getWriteConflicts()) - conflictsBefore
    const lockedJobs = await rawCollection.countDocuments({lockId: {$exists: true}})
    const invalidTries = await rawCollection.countDocuments({tries: {$ne: 1}})
    const storedLockIds = await rawCollection.distinct('lockId')
    const secondClaims = await Promise.all(
      Array.from({length: nPartitions}, (_, partition) =>
        jobsRepo.getJobAndLock(jobNames, 30 * 60 * 1000, CANDIDATE_JOB_ACQUISITION_HINT, partition),
      ),
    )

    const checks = {
      returnedEveryJob: claimedJobIds.length === totalJobs,
      noJobClaimedTwice: new Set(claimedJobIds).size === totalJobs,
      uniqueExecutionIds: new Set(claimedExecutionIds).size === totalJobs,
      everyJobLocked: lockedJobs === totalJobs,
      oneTryPerJob: invalidTries === 0,
      uniqueStoredLocks: storedLockIds.length === totalJobs,
      exhaustedQueueReturnsNoClaims: secondClaims.every(job => !job),
    }

    expect(checks).toEqual({
      returnedEveryJob: true,
      noJobClaimedTwice: true,
      uniqueExecutionIds: true,
      everyJobLocked: true,
      oneTryPerJob: true,
      uniqueStoredLocks: true,
      exhaustedQueueReturnsNoClaims: true,
    })

    return {
      label,
      jobs: totalJobs,
      claimers: concurrentClaimers,
      partitions: nPartitions,
      elapsedMs: Math.round(elapsedMs),
      claimsPerSecond: Math.round((totalJobs / elapsedMs) * 1000),
      writeConflicts: conflicts,
      checks,
    }
  }

  try {
    await jobsRepo.jobs.createIndexesPromise
    expect(await jobsRepo.supportsSortedUpdateOne()).toBe(true)

    const hello = await admin.command({hello: 1})
    const scenarioDefinitions = [
      {
        key: 'legacy',
        label: 'findOneAndUpdate / 1 partition',
        sortedUpdateOne: false,
        nPartitions: 1,
      },
      {
        key: 'sorted1',
        label: 'sorted updateOne / 1 partition',
        sortedUpdateOne: true,
        nPartitions: 1,
      },
      {
        key: 'sorted8',
        label: 'sorted updateOne / 8 partitions',
        sortedUpdateOne: true,
        nPartitions: 8,
      },
      {
        key: 'sorted32',
        label: 'sorted updateOne / 32 partitions',
        sortedUpdateOne: true,
        nPartitions: 32,
      },
      {
        key: 'sorted64',
        label: 'sorted updateOne / 64 partitions',
        sortedUpdateOne: true,
        nPartitions: 64,
      },
      {
        key: 'sorted128',
        label: 'sorted updateOne / 128 partitions',
        sortedUpdateOne: true,
        nPartitions: 128,
      },
      {
        key: 'sorted256',
        label: 'sorted updateOne / 256 partitions',
        sortedUpdateOne: true,
        nPartitions: 256,
      },
    ]
    const requestedScenario = process.env.DOGS_STRESS_SCENARIO
    const selectedScenarios = requestedScenario
      ? scenarioDefinitions.filter(scenario => scenario.key === requestedScenario)
      : scenarioDefinitions.filter(scenario =>
          ['legacy', 'sorted1', 'sorted8', 'sorted32'].includes(scenario.key),
        )

    if (selectedScenarios.length === 0) {
      throw new Error(`Unknown stress scenario "${requestedScenario}"`)
    }

    const scenarios = []
    for (const scenario of selectedScenarios) {
      const result = await runScenario(
        scenario.label,
        scenario.sortedUpdateOne,
        scenario.nPartitions,
      )
      scenarios.push(result)
      console.log(JSON.stringify({databaseName, maxWireVersion: hello.maxWireVersion, result}))
    }

    console.log(
      JSON.stringify(
        {
          databaseName,
          maxWireVersion: hello.maxWireVersion,
          scenarios,
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
