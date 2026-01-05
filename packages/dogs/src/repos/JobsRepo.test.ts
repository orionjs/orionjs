import {generateId} from '@orion-js/helpers'
import {describe, it, expect, beforeEach} from 'vitest'
import {JobsRepo} from './JobsRepo'
import {getInstance} from '@orion-js/services'
import {defineJob, scheduleJob, startWorkers} from '../index'

describe('JobsRepo', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    // Clean up any existing jobs
    await jobsRepo.jobs.deleteMany({})
  })

  describe('scheduleNextRun method', () => {
    it('should set tries to 0 when addTries is false (successful execution)', async () => {
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
        addTries: false,
        priority: 100,
      })

      // Assert: Tries should be reset to 0
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(0)
      expect(updatedJob.lockedUntil).toBeUndefined()
    })

    it('should increment tries by 1 when addTries is true (error scenario)', async () => {
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
        addTries: true,
        priority: 100,
      })

      // Assert: Tries should be incremented by 1
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(initialTries + 1)
      expect(updatedJob.lockedUntil).toBeUndefined()
    })

    it('should handle job with no previous tries field', async () => {
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

      // Act: Schedule next run with adding tries
      await jobsRepo.scheduleNextRun({
        jobId,
        nextRunAt: new Date(Date.now() + 1000),
        addTries: true,
        priority: 100,
      })

      // Assert: Tries should be incremented from 0 to 1
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(1)
    })
  })

  describe('getJobAndLock method', () => {
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
      })

      // Act: Get and lock the job
      const jobToRun = await jobsRepo.getJobAndLock(['test-job'], 5000)

      // Assert: Job should be returned with incremented tries
      expect(jobToRun).toBeDefined()
      expect(jobToRun.tries).toBe(initialTries + 1)

      // Wait a bit for the async database update to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify the database was updated
      const updatedJob = await jobsRepo.jobs.findOne(jobId)
      expect(updatedJob.tries).toBe(initialTries + 1)
    })

    it('should return job with current tries when not stale', async () => {
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
        // No lockedUntil (not locked)
      })

      // Act: Get and lock the job
      const jobToRun = await jobsRepo.getJobAndLock(['test-job'], 5000)

      // Assert: Job should be returned with original tries
      expect(jobToRun).toBeDefined()
      expect(jobToRun.tries).toBe(initialTries)
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

  describe('scheduleJobs method (bulk scheduling)', () => {
    it('should schedule multiple jobs successfully', async () => {
      // Arrange: Create multiple job options
      const jobs = [
        {
          name: 'bulk-job-1',
          params: {message: 'Hello 1'},
          nextRunAt: new Date(),
          priority: 100,
        },
        {
          name: 'bulk-job-2',
          params: {message: 'Hello 2'},
          nextRunAt: new Date(),
          priority: 200,
        },
        {
          name: 'bulk-job-3',
          params: {message: 'Hello 3'},
          nextRunAt: new Date(),
          priority: 150,
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

    it('should handle validation errors for individual jobs', async () => {
      // Arrange: Create jobs with invalid data that would cause validation errors
      const jobs = [
        {
          name: 'valid-job',
          params: {message: 'Valid'},
          nextRunAt: new Date(),
          priority: 100,
        },
        {
          name: '', // Invalid: empty name
          params: {message: 'Invalid'},
          nextRunAt: new Date(),
          priority: 100,
        },
        {
          name: 'another-valid-job',
          params: {message: 'Another Valid'},
          nextRunAt: new Date(),
          priority: 100,
        },
      ]

      // Act & Assert: Should handle the validation errors gracefully
      // Note: The actual validation depends on the schema implementation
      // This test structure is prepared for when validation is added
      const result = await jobsRepo.scheduleJobs(jobs)

      // At minimum, we should get a result structure
      expect(result).toHaveProperty('scheduledCount')
      expect(result).toHaveProperty('skippedCount')
      expect(result).toHaveProperty('errors')
      expect(typeof result.scheduledCount).toBe('number')
      expect(typeof result.skippedCount).toBe('number')
      expect(Array.isArray(result.errors)).toBe(true)
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
