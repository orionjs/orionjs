import {beforeEach, describe, expect, it, mock} from 'bun:test'
import {generateId, sleep} from '@orion-js/helpers'
import {getInstance} from '@orion-js/services'
import {defineJob, scheduleJob, startWorkers} from '.'
import {JobsRepo} from './repos/JobsRepo'
import {DEFAULT_MAX_TRIES_REACHED_RETENTION_MS} from './types/StartConfig'
import {JobToRun} from './types/Worker'

describe('Max tries functionality', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    await jobsRepo.jobs.deleteMany({})
  })

  it('should mark job as maxTriesReached before executing attempt past maxTries', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    const job = defineJob({
      type: 'event',
      async resolve() {
        executionCount++
        throw new Error('Always fails')
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 3,
      maxTriesReachedRetentionMs: 60_000,
      onMaxTriesReached: async (jobToRun: JobToRun) => {
        maxTriesReachedCallback(jobToRun)
      },
    })

    // Wait for max tries to be reached
    await sleep(300)
    await instance.stop()

    expect(executionCount).toBe(3)

    // Callback should have been called
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)
    expect(maxTriesReachedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        name: jobName,
      }),
    )

    // Job should be marked as maxTriesReached in DB
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
    expect(jobRecord.maxTriesReachedAt).toBeInstanceOf(Date)
    expect(jobRecord.expiresAt).toEqual(new Date(jobRecord.maxTriesReachedAt.getTime() + 60_000))
  })

  it('should use job-specific maxTries when defined', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    // Job with custom maxTries of 2 (less than global 5)
    const job = defineJob({
      type: 'event',
      maxTries: 2,
      async resolve() {
        executionCount++
        throw new Error('Always fails')
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 5, // Global maxTries is 5
      onMaxTriesReached: async () => {
        maxTriesReachedCallback()
      },
    })

    await sleep(200)
    await instance.stop()

    expect(executionCount).toBe(2)
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)
  })

  it('should not execute jobs marked as maxTriesReached', async () => {
    const jobName = generateId()
    let executionCount = 0

    const job = defineJob({
      type: 'event',
      async resolve() {
        executionCount++
      },
    })

    // Manually insert a job marked as maxTriesReached
    await jobsRepo.jobs.insertOne({
      _id: generateId(),
      jobName,
      type: 'event',
      priority: 100,
      nextRunAt: new Date(),
      tries: 5,
      status: 'maxTriesReached',
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 3,
      onMaxTriesReached: async () => {},
    })

    await sleep(100)
    await instance.stop()

    // Job should NOT have been executed
    expect(executionCount).toBe(0)
  })

  it('should ignore maxTries for recurrent jobs', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    const job = defineJob({
      type: 'recurrent',
      runEvery: 1000,
      async resolve() {
        executionCount++
        throw new Error('Always fails')
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    // Ensure recurrent job record exists
    await jobsRepo.ensureJobRecord({
      name: jobName,
      type: 'recurrent',
      priority: 100,
    } as any)

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 2,
      onMaxTriesReached: async () => {
        maxTriesReachedCallback()
      },
    })

    await sleep(200)
    await instance.stop()

    expect(executionCount).toBeGreaterThan(2)
    expect(maxTriesReachedCallback).not.toHaveBeenCalled()

    // Recurrent job should still exist without being marked as maxTriesReached
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBeUndefined()
    expect(jobRecord.type).toBe('recurrent')
  })

  it('should reset tries on successful execution and not trigger maxTriesReached', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    // Job that fails twice then succeeds
    const job = defineJob({
      type: 'event',
      async resolve(_, context) {
        executionCount++
        if (context.tries < 3) {
          throw new Error('Fails first two times')
        }
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 5,
      onMaxTriesReached: async () => {
        maxTriesReachedCallback()
      },
    })

    await sleep(150)
    await instance.stop()

    // Should have succeeded before reaching max tries
    expect(executionCount).toBe(3)
    expect(maxTriesReachedCallback).not.toHaveBeenCalled()

    // Job should be deleted (event job after success)
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeNull()
  })

  it('should handle errors in onMaxTriesReached callback gracefully', async () => {
    const jobName = generateId()
    let executionCount = 0

    const job = defineJob({
      type: 'event',
      async resolve() {
        executionCount++
        throw new Error('Always fails')
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 2,
      onMaxTriesReached: async () => {
        throw new Error('Callback error - should be caught')
      },
    })

    // Should not throw even if callback throws
    await sleep(200)
    await instance.stop()

    expect(executionCount).toBe(2)

    // Job should still be marked as maxTriesReached despite callback error
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
  })

  it('should handle jobs without onError reaching max tries', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    // Job without onError handler that always fails
    const job = defineJob({
      type: 'event',
      async resolve() {
        executionCount++
        throw new Error('Always fails')
      },
      // No onError handler - should still respect maxTries
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      defaultLockTime: 10,
      maxTries: 1,
      onMaxTriesReached: async () => {
        maxTriesReachedCallback()
      },
    })

    await sleep(150)
    await instance.stop()

    // Without onError, the failed event job is retried only when it becomes stale.
    // The second pickup increments tries to 2 and gets blocked at start.
    expect(executionCount).toBe(1)
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)

    // Job should be marked as maxTriesReached
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
  })

  it('should stop stale-recovered jobs when they reach max tries', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = mock()

    const job = defineJob({
      type: 'event',
      maxTries: 2,
      async resolve() {
        executionCount++
        await sleep(50)
        throw new Error('Always goes stale before failing')
      },
    })

    await scheduleJob({
      name: jobName,
      runIn: 1,
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 10,
      maxTries: 10,
      onMaxTriesReached: async jobToRun => {
        maxTriesReachedCallback(jobToRun)
      },
    })

    await sleep(150)
    await instance.stop()

    expect(executionCount).toBe(2)
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)
    expect(maxTriesReachedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        name: jobName,
        tries: 3,
        wasStale: true,
      }),
    )

    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
  })
})

describe('JobsRepo maxTriesReached filtering', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    await jobsRepo.jobs.deleteMany({})
  })

  it('should not pick up event jobs with status maxTriesReached', async () => {
    // Insert a job that should be picked up
    const activeJobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: activeJobId,
      jobName: 'active-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(Date.now() - 1000),
    })

    // Insert a job marked as maxTriesReached (should NOT be picked up)
    const maxTriesJobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: maxTriesJobId,
      jobName: 'max-tries-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(Date.now() - 1000),
      status: 'maxTriesReached',
    })

    // Try to get a job
    const jobToRun = await jobsRepo.getJobAndLock(['active-job', 'max-tries-job'], 5000)

    // Should only get the active job
    expect(jobToRun).toBeDefined()
    expect(jobToRun.name).toBe('active-job')
    expect(jobToRun.jobId).toBe(activeJobId)
  })

  it('should pick up recurrent jobs with status maxTriesReached', async () => {
    const jobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: jobId,
      jobName: 'recurrent-job',
      type: 'recurrent',
      priority: 100,
      nextRunAt: new Date(Date.now() - 1000),
      status: 'maxTriesReached',
    })

    const jobToRun = await jobsRepo.getJobAndLock(['recurrent-job'], 5000)

    expect(jobToRun).toBeDefined()
    expect(jobToRun.name).toBe('recurrent-job')
    expect(jobToRun.jobId).toBe(jobId)
  })

  it('should work with existing records that have no status field (backwards compatibility)', async () => {
    // Insert old-style job without status field
    const oldJobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: oldJobId,
      jobName: 'old-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(Date.now() - 1000),
      // No status field - simulating old records
    })

    // Try to get a job
    const jobToRun = await jobsRepo.getJobAndLock(['old-job'], 5000)

    // Should pick up old jobs without status field
    expect(jobToRun).toBeDefined()
    expect(jobToRun.name).toBe('old-job')
  })

  it('should properly mark a job as maxTriesReached', async () => {
    const jobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: jobId,
      jobName: 'test-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(),
      lockedUntil: new Date(Date.now() + 10000),
    })

    // Mark as maxTriesReached
    await jobsRepo.markJobAsMaxTriesReached(jobId)

    // Verify
    const job = await jobsRepo.jobs.findOne(jobId)
    expect(job.status).toBe('maxTriesReached')
    expect(job.lockedUntil).toBeUndefined()
    expect(job.maxTriesReachedAt).toBeInstanceOf(Date)
    expect(job.expiresAt).toEqual(
      new Date(job.maxTriesReachedAt.getTime() + DEFAULT_MAX_TRIES_REACHED_RETENTION_MS),
    )
  })

  it('should ensure the TTL index and apply retention to existing maxTriesReached jobs', async () => {
    const jobId = generateId()
    const lastRunAt = new Date(Date.now() + 60_000)
    await jobsRepo.jobs.insertOne({
      _id: jobId,
      jobName: 'legacy-max-tries-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(),
      lastRunAt,
      status: 'maxTriesReached',
    })

    await jobsRepo.ensureMaxTriesReachedRetention(10_000)

    const indexes = await jobsRepo.jobs.rawCollection.indexes()
    expect(indexes).toContainEqual(
      expect.objectContaining({
        name: 'jobs_dogs_records_expires_at_ttl',
        key: {expiresAt: 1},
        expireAfterSeconds: 0,
      }),
    )

    const backfilledJob = await jobsRepo.jobs.findOne(jobId)
    expect(backfilledJob.maxTriesReachedAt).toEqual(lastRunAt)
    expect(backfilledJob.expiresAt).toEqual(new Date(lastRunAt.getTime() + 10_000))

    await jobsRepo.ensureMaxTriesReachedRetention(20_000)

    const updatedJob = await jobsRepo.jobs.findOne(jobId)
    expect(updatedJob.maxTriesReachedAt).toEqual(lastRunAt)
    expect(updatedJob.expiresAt).toEqual(new Date(lastRunAt.getTime() + 20_000))
  })

  it('should keep maxTriesReached jobs indefinitely when retention is null', async () => {
    const jobId = generateId()
    const maxTriesReachedAt = new Date()
    await jobsRepo.jobs.insertOne({
      _id: jobId,
      jobName: 'permanent-max-tries-job',
      type: 'event',
      priority: 100,
      nextRunAt: new Date(),
      status: 'maxTriesReached',
      maxTriesReachedAt,
      expiresAt: new Date(Date.now() + 60_000),
    })

    await jobsRepo.ensureMaxTriesReachedRetention(null)

    const job = await jobsRepo.jobs.findOne(jobId)
    expect(job.maxTriesReachedAt).toEqual(maxTriesReachedAt)
    expect(job.expiresAt).toBeUndefined()
  })

  it('should not mark a recurrent job as maxTriesReached', async () => {
    const jobId = generateId()
    await jobsRepo.jobs.insertOne({
      _id: jobId,
      jobName: 'test-recurrent-job',
      type: 'recurrent',
      priority: 100,
      nextRunAt: new Date(),
      lockedUntil: new Date(Date.now() + 10000),
    })

    await jobsRepo.markJobAsMaxTriesReached(jobId)

    const job = await jobsRepo.jobs.findOne(jobId)
    expect(job.status).toBeUndefined()
    expect(job.lockedUntil).toBeDefined()
  })
})
