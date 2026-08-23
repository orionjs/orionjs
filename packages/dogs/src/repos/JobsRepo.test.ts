import {beforeEach, describe, expect, it, mock} from 'bun:test'
import {generateId} from '@orion-js/helpers'
import {createIndexesPromises} from '@orion-js/mongodb'
import {getInstance} from '@orion-js/services'
import {defineJob, scheduleJob, startWorkers} from '../index'
import {CANDIDATE_JOB_ACQUISITION_HINT, INITIAL_JOB_ACQUISITION_HINT, JobsRepo} from './JobsRepo'

describe('JobsRepo', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    // Clean up any existing jobs
    await jobsRepo.jobs.deleteMany({})
  })

  describe('scheduleNextRun method', () => {
    it('should set tries to 0 when resetTries is true (successful execution)', async () => {
      // Arrange: Create a job record with some tries
      const jobId = generateId()
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        tries: 5, // Start with 5 tries
      })

      // Act: Schedule next run without adding tries (successful execution)
      await jobsRepo.scheduleNextRun({
        jobId,
        nextRunAt: new Date(Date.now() + 1000),
        resetTries: true,
        priority: 100,
      })

      // Assert: Tries should be reset to 0
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(0)
      expect(updatedJob.lockedUntil).toBeUndefined()
    })

    it('should preserve tries when resetTries is false (retry scenario)', async () => {
      // Arrange: Create a job record with some tries
      const jobId = generateId()
      const initialTries = 3
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        tries: initialTries,
        lockedUntil: new Date(),
      })

      // Act: Schedule next run with adding tries (error scenario)
      await jobsRepo.scheduleNextRun({
        jobId,
        nextRunAt: new Date(Date.now() + 1000),
        resetTries: false,
        priority: 100,
      })

      // Assert: Tries should be preserved until the job is picked up again
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(initialTries)
      expect(updatedJob.lockedUntil).toBeUndefined()
    })

    it('should preserve missing tries when resetTries is false', async () => {
      // Arrange: Create a job record without tries field
      const jobId = generateId()
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        // No tries field
      })

      // Act: Schedule next run without resetting tries
      await jobsRepo.scheduleNextRun({
        jobId,
        nextRunAt: new Date(Date.now() + 1000),
        resetTries: false,
        priority: 100,
      })

      // Assert: Tries should remain unset until the next pickup
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBeUndefined()
    })
  })

  describe('getJobAndLock method', () => {
    it('should cache sorted updateOne support detection from the server wire version', async () => {
      const command = mock(async () => ({maxWireVersion: 25}))
      const indexExists = mock(async () => true)
      const repo = new JobsRepo() as any
      repo.jobs = {
        createIndexesPromise: Promise.resolve([]),
        getRawCollection: async () => ({
          db: {admin: () => ({command})},
          indexExists,
        }),
      }

      expect(await repo.supportsSortedUpdateOne()).toBe(true)
      expect(await repo.supportsSortedUpdateOne()).toBe(true)
      expect(command).toHaveBeenCalledTimes(1)
      expect(indexExists).toHaveBeenCalledTimes(1)
    })

    it('should fall back when the server does not support sorted updateOne', async () => {
      const indexExists = mock(async () => true)
      const repo = new JobsRepo() as any
      repo.jobs = {
        createIndexesPromise: Promise.resolve([]),
        getRawCollection: async () => ({
          db: {admin: () => ({command: async () => ({maxWireVersion: 24})})},
          indexExists,
        }),
      }

      expect(await repo.supportsSortedUpdateOne()).toBe(false)
      expect(indexExists).not.toHaveBeenCalled()
    })

    it('should fall back when the lock recovery index is unavailable', async () => {
      const repo = new JobsRepo() as any
      repo.jobs = {
        createIndexesPromise: Promise.resolve([]),
        getRawCollection: async () => ({
          db: {admin: () => ({command: async () => ({maxWireVersion: 25})})},
          indexExists: async () => false,
        }),
      }

      expect(await repo.supportsSortedUpdateOne()).toBe(false)
    })

    it('should claim with sorted updateOne and recover only its own lock', async () => {
      const updateOne = mock(async () => ({matchedCount: 1}))
      const findOne = mock(async selector => ({
        _id: 'claimed-job',
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        tries: 4,
        lockId: selector.lockId,
        claimWasStale: true,
        partition: 3,
      }))
      const repo = new JobsRepo() as any
      repo.supportsSortedUpdateOne = async () => true
      repo.jobs = {getRawCollection: async () => ({updateOne, findOne})}

      const claimed = await repo.getJobAndLock(
        ['test-job'],
        5000,
        CANDIDATE_JOB_ACQUISITION_HINT,
        3,
      )

      expect(updateOne).toHaveBeenCalledTimes(1)
      expect(updateOne.mock.calls[0][0].partition).toBe(3)
      expect(findOne).toHaveBeenCalledTimes(1)
      expect(findOne.mock.calls[0][0]).toEqual({lockId: claimed.executionId})
      expect(claimed).toMatchObject({
        jobId: 'claimed-job',
        lockId: claimed.executionId,
        tries: 4,
        wasStale: true,
      })
    })

    it('should not return an ambiguous claim when lock recovery finds no document', async () => {
      const repo = new JobsRepo() as any
      repo.supportsSortedUpdateOne = async () => true
      repo.jobs = {
        getRawCollection: async () => ({
          updateOne: async () => ({matchedCount: 1}),
          findOne: async () => null,
        }),
      }

      expect(await repo.getJobAndLock(['test-job'], 5000)).toBeUndefined()
    })

    it('should support explains with both acquisition hints', async () => {
      await Promise.all(createIndexesPromises)

      const initialExecutionTime = await jobsRepo.getJobAcquisitionExecutionTime(
        ['test-job'],
        INITIAL_JOB_ACQUISITION_HINT,
      )
      const candidateExecutionTime = await jobsRepo.getJobAcquisitionExecutionTime(
        ['test-job'],
        CANDIDATE_JOB_ACQUISITION_HINT,
      )

      expect(initialExecutionTime).toBeGreaterThanOrEqual(0)
      expect(candidateExecutionTime).toBeGreaterThanOrEqual(0)
    })

    it('should increment tries when picking up a stale job', async () => {
      // Arrange: Create a stale job (locked in the past)
      const jobId = generateId()
      const initialTries = 2
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(Date.now() - 1000), // Past date
        tries: initialTries,
        lockedUntil: new Date(Date.now() - 1000), // Past lock time (stale)
        partition: 0,
      })

      // Act: Get and lock the job
      const jobToRun = await jobsRepo.getJobAndLock(
        ['test-job'],
        5000,
        CANDIDATE_JOB_ACQUISITION_HINT,
      )

      // Assert: Job should be returned with incremented tries
      expect(jobToRun).toBeDefined()
      expect(jobToRun.tries).toBe(initialTries + 1)
      expect(jobToRun.lockId).toBe(jobToRun.executionId)

      // Wait a bit for the async database update to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify the database was updated
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(initialTries + 1)
      expect(updatedJob.lockId).toBe(jobToRun.executionId)
    })

    it('should increment tries when picking up a non-stale job', async () => {
      // Arrange: Create a non-stale job
      const jobId = generateId()
      const initialTries = 1
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'test-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(Date.now() - 1000), // Past date (ready to run)
        tries: initialTries,
        partition: 0,
        // No lockedUntil (not locked)
      })

      // Act: Get and lock the job
      const jobToRun = await jobsRepo.getJobAndLock(['test-job'], 5000)

      // Assert: Job should be returned with incremented tries
      expect(jobToRun).toBeDefined()
      expect(jobToRun.tries).toBe(initialTries + 1)
      expect(jobToRun.lockId).toBe(jobToRun.executionId)
    })

    it('should reject mutations from an execution that no longer owns the lock', async () => {
      const jobId = generateId()
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName: 'fenced-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        lockedUntil: new Date(Date.now() + 5000),
        lockId: 'new-execution',
      })

      const didDelete = await jobsRepo.deleteEventJob(jobId, 'stale-execution')
      const didReschedule = await jobsRepo.scheduleNextRun({
        jobId,
        lockId: 'stale-execution',
        nextRunAt: new Date(Date.now() + 1000),
        resetTries: false,
        priority: 0,
      })

      expect(didDelete).toBe(false)
      expect(didReschedule).toBe(false)

      const job = await jobsRepo.jobs.findOne(jobId)
      expect(job).toBeDefined()
      expect(job.lockId).toBe('new-execution')
      expect(job.priority).toBe(100)
    })
  })

  describe('Integration tests for tries behavior', () => {
    it('should reset tries to 0 after successful job execution', async () => {
      // Arrange: Define a job that succeeds
      const jobName = generateId()
      let executionCount = 0

      const job = defineJob({
        type: 'event',
        async resolve() {
          executionCount++
          return {success: true}
        },
      })

      // Start with a job that has some tries (simulate previous failures)
      const jobId = generateId()
      await jobsRepo.jobs.insertOne({
        _id: jobId,
        jobName,
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        tries: 3, // Start with 3 tries
      })

      // Act: Start workers and let the job execute
      const instance = startWorkers({
        jobs: {[jobName]: job},
        workersCount: 1,
        pollInterval: 10,
        cooldownPeriod: 10,
        maxTries: 10,
        onMaxTriesReached: async () => {},
      })

      // Wait for job execution
      await new Promise(resolve => setTimeout(resolve, 100))
      await instance.stop()

      // Assert: Job should have been executed and tries reset
      expect(executionCount).toBe(1)

      // Check that the job record was deleted (event jobs are deleted after success)
      const remainingJob = await jobsRepo.jobs.findOne(jobId)
      expect(remainingJob).toBeNull()
    })

    it('should increment tries after job failure with retry', async () => {
      // Arrange: Define a job that fails then succeeds
      const jobName = generateId()
      let executionCount = 0

      const job = defineJob({
        type: 'event',
        async resolve(_, context) {
          executionCount++
          if (context.tries < 3) {
            throw new Error('Simulated failure')
          }
          return {success: true}
        },
        async onError() {
          return {
            action: 'retry',
            runIn: 10, // Retry in 10ms
          }
        },
      })

      // Act: Schedule job and start workers
      await scheduleJob({
        name: jobName,
        runIn: 1,
      })

      const instance = startWorkers({
        jobs: {[jobName]: job},
        workersCount: 1,
        pollInterval: 10,
        cooldownPeriod: 10,
        maxTries: 10,
        onMaxTriesReached: async () => {},
      })

      // Wait for multiple executions
      await new Promise(resolve => setTimeout(resolve, 200))
      await instance.stop()

      // Assert: Job should have been executed multiple times
      expect(executionCount).toBeGreaterThanOrEqual(3)
    })

    it('should properly handle recurrent job tries', async () => {
      // Arrange: Create a recurrent job that fails once then succeeds
      const jobName = generateId()
      let executionCount = 0

      const job = defineJob({
        type: 'recurrent',
        runEvery: 1000, // Run every second
        async resolve() {
          executionCount++
          if (executionCount === 1) {
            throw new Error('First execution fails')
          }
          return {success: true}
        },
        async onError() {
          return {
            action: 'retry',
            runIn: 50,
          }
        },
      })

      // Create the recurrent job record
      await jobsRepo.ensureJobRecord({
        name: jobName,
        type: 'recurrent',
        priority: 100,
        runEvery: 1000,
      } as any)

      // Act: Start workers
      const instance = startWorkers({
        jobs: {[jobName]: job},
        workersCount: 1,
        pollInterval: 10,
        cooldownPeriod: 10,
        maxTries: 10,
        onMaxTriesReached: async () => {},
      })

      // Wait for executions
      await new Promise(resolve => setTimeout(resolve, 200))
      await instance.stop()

      // Assert: Should have executed multiple times
      expect(executionCount).toBeGreaterThanOrEqual(2)

      // The job record should still exist (recurrent jobs are not deleted)
      const jobRecord = await jobsRepo.jobs.findOne({jobName})
      expect(jobRecord).toBeDefined()
      expect(jobRecord.type).toBe('recurrent')
    })
  })

  describe('partition reconciliation', () => {
    it('repairs missing and out-of-range partitions without moving active locks', async () => {
      const now = new Date()
      const records = [
        {_id: 'missing', jobName: 'partition-job'},
        {_id: 'negative', jobName: 'partition-job', partition: -1},
        {_id: 'too-high', jobName: 'partition-job', partition: 8},
        {_id: 'valid', jobName: 'partition-job', partition: 2},
        {
          _id: 'locked',
          jobName: 'partition-job',
          partition: 9,
          lockedUntil: new Date(now.getTime() + 60_000),
          lockId: 'active-lock',
        },
        {
          _id: 'terminal',
          jobName: 'partition-job',
          status: 'maxTriesReached' as const,
        },
      ]

      await jobsRepo.jobs.rawCollection.insertMany(
        records.map(record => ({
          ...record,
          type: 'event',
          priority: 100,
          nextRunAt: now,
        })),
      )

      const modifiedCount = await jobsRepo.reconcilePartitions({
        jobNames: ['partition-job'],
        nPartitions: 4,
        batchSize: 100,
      })
      const byId = new Map(
        (await jobsRepo.jobs.find({jobName: 'partition-job'}).toArray()).map(record => [
          record._id,
          record,
        ]),
      )

      expect(modifiedCount).toBe(3)
      for (const id of ['missing', 'negative', 'too-high']) {
        expect(byId.get(id).partition).toBeGreaterThanOrEqual(0)
        expect(byId.get(id).partition).toBeLessThan(4)
      }
      expect(byId.get('valid').partition).toBe(2)
      expect(byId.get('locked').partition).toBe(9)
      expect(byId.get('terminal').partition).toBeUndefined()
    })

    it('does not move a job after a concurrent claim wins its lock', async () => {
      await jobsRepo.jobs.insertOne({
        _id: 'claim-before-reconcile',
        jobName: 'partition-job',
        type: 'event',
        priority: 100,
        nextRunAt: new Date(),
        partition: 0,
      })

      const claimed = await jobsRepo.getJobAndLock(['partition-job'], 60_000)
      expect(claimed).toBeDefined()

      await jobsRepo.jobs.updateOne('claim-before-reconcile', {$set: {partition: 9}})
      const modifiedCount = await jobsRepo.reconcilePartitions({
        jobNames: ['partition-job'],
        nPartitions: 4,
        batchSize: 100,
      })
      const record = await jobsRepo.jobs.findOne('claim-before-reconcile')

      expect(modifiedCount).toBe(0)
      expect(record.partition).toBe(9)
      expect(record.lockId).toBe(claimed.lockId)
    })
  })

  describe('scheduleJobs method (bulk scheduling)', () => {
    it('should schedule multiple jobs successfully', async () => {
      // Arrange: Create multiple job options
      const jobs = [
        {
          name: 'bulk-job-1',
          params: {message: 'Hello 1'},
          nextRunAt: new Date(),
          priority: 100,
          partition: 0,
        },
        {
          name: 'bulk-job-2',
          params: {message: 'Hello 2'},
          nextRunAt: new Date(),
          priority: 200,
          partition: 1,
        },
        {
          name: 'bulk-job-3',
          params: {message: 'Hello 3'},
          nextRunAt: new Date(),
          priority: 150,
          partition: 2,
        },
      ]

      // Act: Schedule all jobs at once
      const result = await jobsRepo.scheduleJobs(jobs)

      // Assert: All jobs should be scheduled successfully
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify jobs exist in database
      const scheduledJobs = await jobsRepo.jobs
        .find({
          jobName: {$in: ['bulk-job-1', 'bulk-job-2', 'bulk-job-3']},
        })
        .toArray()
      expect(scheduledJobs).toHaveLength(3)
      expect(scheduledJobs.every(job => job.type === 'event')).toBe(true)
      expect(scheduledJobs.map(job => job.partition).sort()).toEqual([0, 1, 2])
    })

    it('should handle empty job array', async () => {
      // Act: Schedule empty array
      const result = await jobsRepo.scheduleJobs([])

      // Assert: Should return zeros for all counts
      expect(result.scheduledCount).toBe(0)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle jobs without validation errors', async () => {
      // Arrange: Create multiple valid jobs
      const jobs = [
        {
          name: 'valid-job-1',
          params: {message: 'Valid 1'},
          nextRunAt: new Date(),
          priority: 100,
        },
        {
          name: 'valid-job-2',
          params: {message: 'Valid 2'},
          nextRunAt: new Date(),
          priority: 200,
        },
        {
          name: 'valid-job-3',
          params: {message: 'Valid 3'},
          nextRunAt: new Date(),
          priority: 150,
        },
      ]

      // Act: Schedule all valid jobs
      const result = await jobsRepo.scheduleJobs(jobs)

      // Assert: All jobs should be scheduled successfully
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify all jobs were added to the database
      const allJobs = await jobsRepo.jobs
        .find({
          jobName: {$in: ['valid-job-1', 'valid-job-2', 'valid-job-3']},
        })
        .toArray()
      expect(allJobs).toHaveLength(3)

      const jobNames = allJobs.map(job => job.jobName).sort()
      expect(jobNames).toEqual(['valid-job-1', 'valid-job-2', 'valid-job-3'])
    })

    it('should atomically skip duplicate unique identifiers without changing the existing job', async () => {
      const firstRunAt = new Date('2026-01-01T00:00:00.000Z')
      const duplicateRunAt = new Date('2026-02-01T00:00:00.000Z')

      const firstResult = await jobsRepo.scheduleJobs([
        {
          name: 'bulk-deduplicated-job',
          params: {version: 'original'},
          nextRunAt: firstRunAt,
          priority: 40,
          partition: 3,
          uniqueIdentifier: 'bulk-deduplicated-job-1',
        },
      ])
      const duplicateResult = await jobsRepo.scheduleJobs([
        {
          name: 'bulk-deduplicated-job',
          params: {version: 'duplicate'},
          nextRunAt: duplicateRunAt,
          priority: 999,
          partition: 8,
          uniqueIdentifier: 'bulk-deduplicated-job-1',
        },
      ])

      expect(firstResult).toMatchObject({scheduledCount: 1, skippedCount: 0, errors: []})
      expect(duplicateResult).toMatchObject({scheduledCount: 0, skippedCount: 1, errors: []})

      const [record] = await jobsRepo.jobs
        .find({uniqueIdentifier: 'bulk-deduplicated-job-1'})
        .toArray()
      expect(record).toMatchObject({
        params: {version: 'original'},
        nextRunAt: firstRunAt,
        priority: 40,
        partition: 3,
      })
    })

    it('should deduplicate overlapping unordered bulk schedules under concurrency', async () => {
      const uniqueJobs = 250
      const callers = 4
      const batches = Array.from({length: callers}, (_, caller) =>
        Array.from({length: uniqueJobs}, (_, index) => ({
          name: 'concurrent-bulk-job',
          params: {caller, index},
          nextRunAt: new Date(),
          priority: 40,
          partition: index % 30,
          uniqueIdentifier: `concurrent-bulk-job-${index}`,
        })),
      )

      const results = await Promise.all(batches.map(batch => jobsRepo.scheduleJobs(batch)))
      const records = await jobsRepo.jobs.find({jobName: 'concurrent-bulk-job'}).toArray()

      expect(results.reduce((total, result) => total + result.scheduledCount, 0)).toBe(uniqueJobs)
      expect(results.reduce((total, result) => total + result.skippedCount, 0)).toBe(
        uniqueJobs * (callers - 1),
      )
      expect(results.flatMap(result => result.errors)).toHaveLength(0)
      expect(records).toHaveLength(uniqueJobs)
      expect(records.every(record => record.partition >= 0 && record.partition < 30)).toBe(true)
    })

    it('should keep valid jobs when another item in the bulk fails validation', async () => {
      const jobs = [
        {
          name: 'valid-job',
          params: {message: 'Valid'},
          nextRunAt: new Date(),
          priority: 100,
        },
        {
          name: 'invalid-job',
          params: {message: 'Invalid'},
          nextRunAt: 'not-a-date' as unknown as Date,
          priority: 100,
        },
        {
          name: 'another-valid-job',
          params: {message: 'Another Valid'},
          nextRunAt: new Date(),
          priority: 100,
        },
      ]

      const result = await jobsRepo.scheduleJobs(jobs)

      expect(result.scheduledCount).toBe(2)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({index: 1, job: jobs[1]})
      expect(
        await jobsRepo.jobs.find({jobName: {$in: jobs.map(job => job.name)}}).toArray(),
      ).toHaveLength(2)
    })

    it('should handle jobs with different priorities and timing', async () => {
      // Arrange: Create jobs with different characteristics
      const now = new Date()
      const jobs = [
        {
          name: 'high-priority-job',
          params: {message: 'High Priority'},
          nextRunAt: new Date(now.getTime() + 1000),
          priority: 300,
        },
        {
          name: 'medium-priority-job',
          params: {message: 'Medium Priority'},
          nextRunAt: new Date(now.getTime() + 2000),
          priority: 200,
        },
        {
          name: 'low-priority-job',
          params: {message: 'Low Priority'},
          nextRunAt: new Date(now.getTime() + 3000),
          priority: 100,
        },
      ]

      // Act: Schedule jobs with different priorities
      const result = await jobsRepo.scheduleJobs(jobs)

      // Assert: All should be scheduled successfully
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify all jobs exist with correct priorities
      const allJobs = await jobsRepo.jobs
        .find({
          jobName: {$in: ['high-priority-job', 'medium-priority-job', 'low-priority-job']},
        })
        .toArray()
      expect(allJobs).toHaveLength(3)

      // Check priorities are correctly set
      const highPriorityJob = allJobs.find(j => j.jobName === 'high-priority-job')
      const mediumPriorityJob = allJobs.find(j => j.jobName === 'medium-priority-job')
      const lowPriorityJob = allJobs.find(j => j.jobName === 'low-priority-job')

      expect(highPriorityJob.priority).toBe(300)
      expect(mediumPriorityJob.priority).toBe(200)
      expect(lowPriorityJob.priority).toBe(100)
    })
  })
})
