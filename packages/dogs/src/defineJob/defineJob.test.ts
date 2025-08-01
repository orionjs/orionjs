import {describe, it, expect, beforeEach} from 'vitest'
import {createEventJob} from './index'
import {getInstance} from '@orion-js/services'
import {JobsRepo} from '../repos/JobsRepo'

describe('Event Job Definition - scheduleJobs method', () => {
  let jobsRepo: JobsRepo

  beforeEach(async () => {
    jobsRepo = getInstance(JobsRepo)
    // Clean up any existing jobs
    await jobsRepo.jobs.deleteMany({})
  })

  describe('scheduleJobs method', () => {
    it('should schedule multiple jobs successfully through job definition', async () => {
      // Arrange: Create an event job definition
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
          priority: {type: Number, optional: true},
        },
        resolve: async (params, _context) => {
          // Mock resolver
          return {success: true, message: params.message}
        },
      })

      // Set the job name (normally done by startWorkers)
      jobDefinition.jobName = 'test-bulk-job'

      const jobsToSchedule = [
        {
          params: {message: 'Hello 1', priority: 100},
          runIn: 1000, // 1 second
        },
        {
          params: {message: 'Hello 2', priority: 200},
          runAt: new Date(Date.now() + 2000), // 2 seconds
        },
        {
          params: {message: 'Hello 3'},
          priority: 150,
        },
      ]

      // Act: Schedule multiple jobs using the job definition method
      const result = await jobDefinition.scheduleJobs(jobsToSchedule)

      // Assert: All jobs should be scheduled successfully
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify jobs exist in database with correct name
      const scheduledJobs = await jobsRepo.jobs
        .find({
          jobName: 'test-bulk-job',
        })
        .toArray()
      expect(scheduledJobs).toHaveLength(3)
      expect(scheduledJobs.every(job => job.type === 'event')).toBe(true)
      expect(scheduledJobs.every(job => job.jobName === 'test-bulk-job')).toBe(true)

      // Verify parameters are correctly stored
      const messages = scheduledJobs.map(job => job.params.message).sort()
      expect(messages).toEqual(['Hello 1', 'Hello 2', 'Hello 3'])
    })

    it('should validate parameters using schema when scheduling multiple jobs', async () => {
      // Arrange: Create job with strict schema
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
          count: {type: Number},
        },
        resolve: async (_params, _context) => {
          return {success: true}
        },
      })

      jobDefinition.jobName = 'test-validation-job'

      const jobsToSchedule = [
        {
          params: {message: 'Valid job', count: 42},
        },
        {
          params: {message: 'Another valid job', count: 24},
        },
      ]

      // Act: Schedule jobs with valid parameters
      const result = await jobDefinition.scheduleJobs(jobsToSchedule)

      // Assert: Should succeed with validation
      expect(result.scheduledCount).toBe(2)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify validated parameters are stored correctly
      const scheduledJobs = await jobsRepo.jobs
        .find({
          jobName: 'test-validation-job',
        })
        .toArray()
      expect(scheduledJobs).toHaveLength(2)
      expect(scheduledJobs[0].params).toMatchObject({
        message: expect.any(String),
        count: expect.any(Number),
      })
    })

    it('should handle bulk scheduling with various job configurations', async () => {
      // Arrange: Create job definition
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
          priority: {type: Number, optional: true},
        },
        resolve: async (_params, _context) => {
          return {success: true}
        },
      })

      jobDefinition.jobName = 'test-config-job'

      const jobsToSchedule = [
        {
          params: {message: 'First job'},
          runIn: 1000,
          priority: 100,
        },
        {
          params: {message: 'Second job'},
          priority: 200,
        },
        {
          params: {message: 'Third job'},
          runAt: new Date(Date.now() + 5000),
          priority: 150,
        },
      ]

      // Act: Schedule jobs with different configurations
      const result = await jobDefinition.scheduleJobs(jobsToSchedule)

      // Assert: All jobs should be scheduled successfully
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify jobs were stored correctly
      const scheduledJobs = await jobsRepo.jobs
        .find({
          jobName: 'test-config-job',
        })
        .toArray()
      expect(scheduledJobs).toHaveLength(3)

      const messages = scheduledJobs.map(job => job.params.message).sort()
      expect(messages).toEqual(['First job', 'Second job', 'Third job'])

      // Verify priorities are set correctly
      const priorities = scheduledJobs.map(job => job.priority).sort((a, b) => a - b)
      expect(priorities).toEqual([100, 150, 200])
    })

    it('should throw error if job is not registered when scheduling multiple jobs', async () => {
      // Arrange: Create job definition without setting jobName
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
        },
        resolve: async (_params, _context) => {
          return {success: true}
        },
      })

      // jobName is intentionally not set

      const jobsToSchedule = [
        {
          params: {message: 'Test job'},
        },
      ]

      // Act & Assert: Should throw error
      await expect(jobDefinition.scheduleJobs(jobsToSchedule)).rejects.toThrow(
        'This job has not been registered in the workers',
      )
    })

    it('should handle empty array when scheduling multiple jobs', async () => {
      // Arrange: Create job definition
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
        },
        resolve: async (_params, _context) => {
          return {success: true}
        },
      })

      jobDefinition.jobName = 'test-empty-job'

      // Act: Schedule empty array
      const result = await jobDefinition.scheduleJobs([])

      // Assert: Should return zeros
      expect(result.scheduledCount).toBe(0)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle scheduling with different timing options', async () => {
      // Arrange: Create job definition
      const jobDefinition = createEventJob({
        params: {
          message: {type: String},
        },
        resolve: async (_params, _context) => {
          return {success: true}
        },
      })

      jobDefinition.jobName = 'test-timing-job'

      const now = new Date()
      const jobsToSchedule = [
        {
          params: {message: 'Run immediately'},
          // No timing specified, should run immediately
        },
        {
          params: {message: 'Run in 5 seconds'},
          runIn: 5000,
        },
        {
          params: {message: 'Run at specific time'},
          runAt: new Date(now.getTime() + 10000),
        },
      ]

      // Act: Schedule jobs with different timing
      const result = await jobDefinition.scheduleJobs(jobsToSchedule)

      // Assert: All should be scheduled
      expect(result.scheduledCount).toBe(3)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify jobs have correct run times
      const scheduledJobs = await jobsRepo.jobs
        .find({
          jobName: 'test-timing-job',
        })
        .toArray()
      expect(scheduledJobs).toHaveLength(3)

      // Check that run times are set appropriately
      const runTimes = scheduledJobs.map(job => job.nextRunAt.getTime()).sort()
      expect(runTimes[0]).toBeLessThanOrEqual(now.getTime() + 1000) // First job runs soon
      expect(runTimes[1]).toBeGreaterThan(now.getTime() + 4000) // Second job runs in ~5 seconds
      expect(runTimes[2]).toBeGreaterThan(now.getTime() + 9000) // Third job runs in ~10 seconds
    })
  })
})
