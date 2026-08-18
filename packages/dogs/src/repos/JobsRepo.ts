import {generateId} from '@orion-js/helpers'
import {logger} from '@orion-js/logger'
import {Collection, MongoCollection, MongoDB, Repository} from '@orion-js/mongodb'
import {ScheduleJobRecordOptions, ScheduleJobsResult} from '../types/Events'
import {JobRecord, JobRecordSchema} from '../types/JobRecord'
import {JobDefinitionWithName, RecurrentJobDefinition} from '../types/JobsDefinition'
import {DEFAULT_MAX_TRIES_REACHED_RETENTION_MS} from '../types/StartConfig'
import {JobToRun} from '../types/Worker'

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
      {
        keys: {
          expiresAt: 1,
        },
        name: 'jobs_dogs_records_expires_at_ttl',
        expireAfterSeconds: 0,
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
        $and: [
          {$or: [{lockedUntil: {$exists: false}}, {lockedUntil: {$lte: new Date()}}]},
          // Exclude event jobs that have reached max tries. Recurrent jobs keep running even
          // if old records still have this status from previous versions.
          {$or: [{type: {$ne: 'event'}}, {status: {$ne: 'maxTriesReached'}}]},
        ],
      },
      {
        $set: {lockedUntil, lastRunAt: new Date()},
        $inc: {tries: 1},
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

    const tries = (job.tries || 0) + 1
    const wasStale = Boolean(job.lockedUntil)

    if (wasStale) {
      logger.info(`Running job "${job.jobName}" that was staled`)
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
      wasStale,
    }
  }

  async setJobRecordPriority(jobId: string, priority: number) {
    await this.jobs.updateOne(jobId, {$set: {priority}})
  }

  async scheduleNextRun(options: {
    jobId: string
    nextRunAt: Date
    resetTries: boolean
    priority: number
  }) {
    const updator: MongoDB.UpdateFilter<JobRecord> = {
      $set: {
        nextRunAt: options.nextRunAt,
        priority: options.priority,
        ...(options.resetTries ? {tries: 0} : {}),
      },
      $unset: {lockedUntil: ''},
    }

    await this.jobs.updateOne(options.jobId, updator)
  }

  async deleteEventJob(jobId: string) {
    await this.jobs.deleteOne({_id: jobId, type: 'event'})
  }

  /**
   * Marks an event job as having reached its maximum tries limit.
   * The job won't be picked up for execution and MongoDB will delete it after
   * the configured retention period.
   */
  async markJobAsMaxTriesReached(
    jobId: string,
    retentionMs: number | null = DEFAULT_MAX_TRIES_REACHED_RETENTION_MS,
  ) {
    const maxTriesReachedAt = new Date()
    await this.jobs.updateOne(
      {_id: jobId, type: 'event'},
      {
        $set: {
          status: 'maxTriesReached',
          maxTriesReachedAt,
          ...(retentionMs === null
            ? {}
            : {expiresAt: new Date(maxTriesReachedAt.getTime() + retentionMs)}),
        },
        $unset: {
          lockedUntil: '',
          ...(retentionMs === null ? {expiresAt: ''} : {}),
        },
      },
    )
  }

  /**
   * Applies the current retention configuration to existing maxTriesReached
   * event jobs. The collection definition ensures the TTL index. Legacy records
   * use lastRunAt as their retention anchor when available.
   */
  async ensureMaxTriesReachedRetention(retentionMs: number | null) {
    const selector = {
      type: 'event' as const,
      status: 'maxTriesReached' as const,
    }

    if (retentionMs === null) {
      await this.jobs.updateMany(selector, {$unset: {expiresAt: ''}})
      return
    }

    const now = new Date()
    const retentionAnchor = {
      $ifNull: ['$maxTriesReachedAt', {$ifNull: ['$lastRunAt', now]}],
    }

    await this.jobs.rawCollection.updateMany(selector, [
      {
        $set: {
          maxTriesReachedAt: retentionAnchor,
          expiresAt: {$add: [retentionAnchor, retentionMs]},
        },
      },
    ])
  }

  async extendLockTime(jobId: string, extraTime: number) {
    await this.updateLockTime(jobId, extraTime)
  }

  /**
   * Updates the lock time for a job to the specified duration from now.
   * Can be used to both extend or shorten the lock time.
   */
  async updateLockTime(jobId: string, lockDuration: number) {
    const lockedUntil = new Date(Date.now() + lockDuration)
    await this.jobs.updateOne(
      {
        _id: jobId,
      },
      {
        $set: {lockedUntil},
      },
    )
  }

  async unlockAllJobs(): Promise<number> {
    const result = await this.jobs.updateMany(
      {
        lockedUntil: {$exists: true},
      },
      {
        $unset: {lockedUntil: ''},
      },
    )

    return result.modifiedCount
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
        $unset: {
          status: '',
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
