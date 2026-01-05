import {sleep, generateId} from '@orion-js/helpers'
import {getInstance} from '@orion-js/services'
import {defineJob, scheduleJob, startWorkers} from '.'
import {JobsRepo} from './repos/JobsRepo'
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {JobToRun} from './types/Worker'

describe('Max tries functionality', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    await jobsRepo.jobs.deleteMany({})
  })

  it('should mark job as maxTriesReached when max tries is exceeded', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = vi.fn()

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
      onMaxTriesReached: async (jobToRun: JobToRun) => {
        maxTriesReachedCallback(jobToRun)
      },
    })

    // Wait for max tries to be reached
    await sleep(300)
    await instance.stop()

    // Note: Due to how tries tracking works (starts at 1, DB increments after each fail),
    // with maxTries = 3, the job executes 4 times before tries reaches 3
    expect(executionCount).toBe(4)

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
  })

  it('should use job-specific maxTries when defined', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = vi.fn()

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

    // Note: With maxTries = 2 and the tries tracking behavior, job executes 3 times
    expect(executionCount).toBe(3)
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

  it('should handle recurrent jobs reaching max tries', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = vi.fn()

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

    // Note: With maxTries = 2 and the tries tracking behavior, job executes 3 times
    expect(executionCount).toBe(3)
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)

    // Recurrent job should still exist but be marked as maxTriesReached
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
    expect(jobRecord.type).toBe('recurrent')
  })

  it('should reset tries on successful execution and not trigger maxTriesReached', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = vi.fn()

    // Job that fails twice then succeeds
    const job = defineJob({
      type: 'event',
      async resolve(_, context) {
        executionCount++
        if (context.tries < 2) {
          throw new Error('Fails first two times')
        }
        // Success on 3rd try
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
    expect(executionCount).toBeGreaterThanOrEqual(2)
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

    // Note: With maxTries = 2 and the tries tracking behavior, job executes 3 times
    expect(executionCount).toBe(3)

    // Job should still be marked as maxTriesReached despite callback error
    const jobRecord = await jobsRepo.jobs.findOne({jobName})
    expect(jobRecord).toBeDefined()
    expect(jobRecord.status).toBe('maxTriesReached')
  })

  it('should handle jobs without onError reaching max tries', async () => {
    const jobName = generateId()
    let executionCount = 0
    const maxTriesReachedCallback = vi.fn()

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
      maxTries: 1,
      onMaxTriesReached: async () => {
        maxTriesReachedCallback()
      },
    })

    await sleep(100)
    await instance.stop()

    // Should have executed once and hit max tries
    expect(executionCount).toBe(1)
    expect(maxTriesReachedCallback).toHaveBeenCalledTimes(1)

    // Job should be marked as maxTriesReached
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

  it('should not pick up jobs with status maxTriesReached', async () => {
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
  })
})
