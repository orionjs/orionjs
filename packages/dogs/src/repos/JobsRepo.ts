import {generateId} from '@orion-js/helpers'
import {logger} from '@orion-js/logger'
import {Collection, MongoDB, MongoCollection} from '@orion-js/mongodb'
import {ScheduleJobRecordOptions, ScheduleJobsResult} from '../types/Events'
import {JobRecord} from '../types/JobRecord'
import {JobDefinitionWithName, RecurrentJobDefinition} from '../types/JobsDefinition'
import {JobToRun} from '../types/Worker'
import {Repository} from '@orion-js/mongodb'
import {JobRecordSchema} from '../types/JobRecord'

@Repository()
export class JobsRepo {
  @MongoCollection({
    idGeneration: 'uuid',
    name: 'orionjs.jobs_dogs_records',
    schema: JobRecordSchema,
    indexes: [
      {
        keys: {
          jobName: 1,
          priority: -1,
          nextRunAt: 1,
        },
      },
      {
        keys: {
          jobName: 1,
        },
        options: {
          unique: true,
          partialFilterExpression: {type: 'recurrent'},
        },
      },
      {
        keys: {
          uniqueIdentifier: 1,
        },
        options: {
          unique: true,
          sparse: true,
        },
      },
    ],
  })
  jobs: Collection<JobRecord>

  async getJobAndLock(jobNames: string[], lockTime: number): Promise<JobToRun> {
    const lockedUntil = new Date(Date.now() + lockTime)

    const job = await this.jobs.findOneAndUpdate(
      {
        jobName: {$in: jobNames},
        nextRunAt: {$lte: new Date()},
        $or: [{lockedUntil: {$exists: false}}, {lockedUntil: {$lte: new Date()}}],
      },
      {
        $set: {lockedUntil, lastRunAt: new Date()},
      },
      {
        mongoOptions: {
          sort: {
            priority: -1,
            nextRunAt: 1,
          },
          returnDocument: 'before',
        },
      },
    )

    if (!job) return

    let tries = job.tries || 1

    if (job.lockedUntil) {
      logger.info(`Running job "${job.jobName}" that was staled`)
      this.jobs.updateOne(job._id, {$inc: {tries: 1}})
      tries++
    }

    return {
      jobId: job._id,
      executionId: generateId(),
      name: job.jobName,
      params: job.params,
      type: job.type,
      tries,
      lockTime,
      priority: job.priority,
      uniqueIdentifier: job.uniqueIdentifier,
    }
  }

  async setJobRecordPriority(jobId: string, priority: number) {
    await this.jobs.updateOne(jobId, {$set: {priority}})
  }

  async scheduleNextRun(options: {
    jobId: string
    nextRunAt: Date
    addTries: boolean
    priority: number
  }) {
    const updator: MongoDB.UpdateFilter<JobRecord> = {
      $set: {
        nextRunAt: options.nextRunAt,
        priority: options.priority,
        ...(options.addTries ? {} : {tries: 0}),
      },
      $unset: {lockedUntil: ''},
      ...(options.addTries ? {$inc: {tries: 1}} : {}),
    }

    await this.jobs.updateOne(options.jobId, updator)
  }

  async deleteEventJob(jobId: string) {
    await this.jobs.deleteOne({_id: jobId, type: 'event'})
  }

  async extendLockTime(jobId: string, extraTime: number) {
    const lockedUntil = new Date(Date.now() + extraTime)
    await this.jobs.updateOne(
      {
        _id: jobId,
      },
      {
        $set: {lockedUntil},
      },
    )
  }

  async ensureJobRecord(job: JobDefinitionWithName) {
    const result = await this.jobs.upsert(
      {
        jobName: job.name,
      },
      {
        $set: {
          type: job.type,
          priority: (job as RecurrentJobDefinition).priority,
        },
        $setOnInsert: {
          nextRunAt: new Date(),
        },
      },
    )

    if (result.upsertedId) {
      logger.debug(`Created job record for "${job.name}"`)
    } else {
      logger.debug(`Record for job "${job.name}" already exists`)
    }
  }

  async scheduleJob(options: ScheduleJobRecordOptions) {
    try {
      await this.jobs.insertOne({
        jobName: options.name,
        uniqueIdentifier: options.uniqueIdentifier,
        params: options.params,
        nextRunAt: options.nextRunAt,
        priority: options.priority,
        type: 'event',
      })
    } catch (error) {
      if (
        error.isValidationError &&
        Object.values(error.validationErrors).includes('notUnique') &&
        options.uniqueIdentifier
      ) {
        logger.info(
          `Job "${options.name}" with identifier "${options.uniqueIdentifier}" already exists`,
        )
      } else {
        throw error
      }
    }
  }

  async scheduleJobs(jobs: ScheduleJobRecordOptions[]): Promise<ScheduleJobsResult> {
    if (jobs.length === 0) {
      return {scheduledCount: 0, skippedCount: 0, errors: []}
    }

    // Process each job individually to handle errors properly
    let scheduledCount = 0
    let skippedCount = 0
    const errors: Array<{index: number; error: Error; job: ScheduleJobRecordOptions}> = []

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      try {
        // Insert directly to get better error handling than the single scheduleJob method
        await this.jobs.insertOne({
          jobName: job.name,
          uniqueIdentifier: job.uniqueIdentifier,
          params: job.params,
          nextRunAt: job.nextRunAt,
          priority: job.priority,
          type: 'event',
        })
        scheduledCount++
      } catch (error) {
        // Check if it's a validation error with uniqueIdentifier constraint
        if (
          error.isValidationError &&
          Object.values(error.validationErrors).includes('notUnique') &&
          job.uniqueIdentifier
        ) {
          logger.info(`Job "${job.name}" with identifier "${job.uniqueIdentifier}" already exists`)
          skippedCount++
        } else {
          errors.push({
            index: i,
            error: error instanceof Error ? error : new Error(String(error)),
            job,
          })
        }
      }
    }

    logger.debug(
      `Scheduled ${scheduledCount} jobs successfully, skipped ${skippedCount}, errors: ${errors.length}`,
    )

    return {
      scheduledCount,
      skippedCount,
      errors,
    }
  }
}
