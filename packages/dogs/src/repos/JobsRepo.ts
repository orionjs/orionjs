import {generateId} from '@orion-js/helpers'
import {logger} from '@orion-js/logger'
import {Collection, MongoCollection, MongoDB, Repository} from '@orion-js/mongodb'
import {getRandomPartition} from '../services/partitions'
import {ScheduleJobRecordOptions, ScheduleJobsResult} from '../types/Events'
import {JobRecord, JobRecordSchema} from '../types/JobRecord'
import {JobDefinitionWithName, RecurrentJobDefinition} from '../types/JobsDefinition'
import {DEFAULT_MAX_TRIES_REACHED_RETENTION_MS} from '../types/StartConfig'
import {JobToRun} from '../types/Worker'

export type JobAcquisitionHint = 'byJobName' | 'globalPriority'

export const JOB_ACQUISITION_HINTS = {
  byJobName: {
    partition: 1,
    jobName: 1,
    priority: -1,
    nextRunAt: 1,
  },
  globalPriority: {
    partition: 1,
    priority: -1,
    nextRunAt: 1,
  },
} as const satisfies Record<JobAcquisitionHint, MongoDB.IndexSpecification>

export const INITIAL_JOB_ACQUISITION_HINT = 'byJobName' as const satisfies JobAcquisitionHint
export const CANDIDATE_JOB_ACQUISITION_HINT = 'globalPriority' as const satisfies JobAcquisitionHint

const SORTED_UPDATE_ONE_MIN_WIRE_VERSION = 25
const LOCK_ID_INDEX_NAME = 'jobs_dogs_records_lock_id'
const PARTITION_JOB_NAME_INDEX_NAME = 'jobs_dogs_records_partition_job_name_priority_next_run'
const PARTITION_PRIORITY_INDEX_NAME = 'jobs_dogs_records_partition_priority_next_run'

const JOB_ACQUISITION_SORT: MongoDB.Sort = {
  priority: -1,
  nextRunAt: 1,
}

function getJobAcquisitionSelector(
  jobNames: string[],
  now: Date,
  partition: number,
): MongoDB.Filter<JobRecord> {
  return {
    partition,
    jobName: {$in: jobNames},
    nextRunAt: {$lte: now},
    $and: [
      {$or: [{lockedUntil: {$exists: false}}, {lockedUntil: {$lte: now}}]},
      // Exclude event jobs that have reached max tries. Recurrent jobs keep running even
      // if old records still have this status from previous versions.
      {$or: [{type: {$ne: 'event'}}, {status: {$ne: 'maxTriesReached'}}]},
    ],
  }
}

@Repository()
export class JobsRepo {
  @MongoCollection({
    idGeneration: 'uuid',
    name: 'orionjs.jobs_dogs_records',
    schema: JobRecordSchema,
    indexes: [
      {
        keys: JOB_ACQUISITION_HINTS.byJobName,
        options: {name: PARTITION_JOB_NAME_INDEX_NAME},
      },
      {
        keys: JOB_ACQUISITION_HINTS.globalPriority,
        options: {name: PARTITION_PRIORITY_INDEX_NAME},
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
          lockId: 1,
        },
        options: {
          name: LOCK_ID_INDEX_NAME,
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

  private sortedUpdateOneSupportPromise?: Promise<boolean>
  private partitionsByJobName = new Map<string, number>()

  configureJobPartitions(jobNames: string[], nPartitions: number) {
    for (const jobName of jobNames) {
      this.partitionsByJobName.set(jobName, nPartitions)
    }
  }

  getJobPartitionsCount(jobName: string) {
    return this.partitionsByJobName.get(jobName)
  }

  async supportsSortedUpdateOne(): Promise<boolean> {
    if (!this.sortedUpdateOneSupportPromise) {
      this.sortedUpdateOneSupportPromise = this.detectSortedUpdateOneSupport()
    }

    return this.sortedUpdateOneSupportPromise
  }

  private async detectSortedUpdateOneSupport(): Promise<boolean> {
    const rawCollection = await this.jobs.getRawCollection()
    // Both acquisition implementations use explicit hints, so the first claim must wait until the
    // declared indexes are ready even when the server needs the legacy fallback.
    await this.jobs.createIndexesPromise
    const hello = await rawCollection.db.admin().command({hello: 1})
    const supportsSortedUpdateOne =
      typeof hello.maxWireVersion === 'number' &&
      hello.maxWireVersion >= SORTED_UPDATE_ONE_MIN_WIRE_VERSION

    if (!supportsSortedUpdateOne) {
      logger.info('MongoDB does not support sorted updateOne; using findOneAndUpdate for jobs.')
      return false
    }

    const hasLockIdIndex = await rawCollection.indexExists(LOCK_ID_INDEX_NAME)
    if (!hasLockIdIndex) {
      logger.warn(
        `MongoDB supports sorted updateOne but index "${LOCK_ID_INDEX_NAME}" is unavailable; using findOneAndUpdate for jobs.`,
      )
      return false
    }

    logger.info('MongoDB supports sorted updateOne; using it for job acquisition.')
    return true
  }

  async getJobAndLock(
    jobNames: string[],
    lockTime: number,
    hint: JobAcquisitionHint = INITIAL_JOB_ACQUISITION_HINT,
    partition = 0,
  ): Promise<JobToRun> {
    if (await this.supportsSortedUpdateOne()) {
      return this.getJobAndLockWithSortedUpdateOne(jobNames, lockTime, hint, partition)
    }

    return this.getJobAndLockWithFindOneAndUpdate(jobNames, lockTime, hint, partition)
  }

  private async getJobAndLockWithFindOneAndUpdate(
    jobNames: string[],
    lockTime: number,
    hint: JobAcquisitionHint,
    partition: number,
  ): Promise<JobToRun> {
    const executionId = generateId()
    const now = new Date()
    const lockedUntil = new Date(now.getTime() + lockTime)

    const job = await this.jobs.findOneAndUpdate(
      getJobAcquisitionSelector(jobNames, now, partition),
      {
        $set: {lockId: executionId, lockedUntil, lastRunAt: now},
        $inc: {tries: 1},
      },
      {
        mongoOptions: {
          hint: JOB_ACQUISITION_HINTS[hint],
          sort: JOB_ACQUISITION_SORT,
          returnDocument: 'before',
        },
      },
    )

    if (!job) return

    const tries = (job.tries || 0) + 1
    const wasStale = Boolean(job.lockedUntil)

    return this.toJobToRun(job, executionId, lockTime, tries, wasStale)
  }

  private async getJobAndLockWithSortedUpdateOne(
    jobNames: string[],
    lockTime: number,
    hint: JobAcquisitionHint,
    partition: number,
  ): Promise<JobToRun> {
    const executionId = generateId()
    const now = new Date()
    const lockedUntil = new Date(now.getTime() + lockTime)
    const rawCollection = await this.jobs.getRawCollection()

    const result = await rawCollection.updateOne(
      getJobAcquisitionSelector(jobNames, now, partition),
      [
        {
          $set: {
            lockId: {$literal: executionId},
            lockedUntil: {$literal: lockedUntil},
            lastRunAt: {$literal: now},
            tries: {$add: [{$ifNull: ['$tries', 0]}, 1]},
            claimWasStale: {$eq: [{$type: '$lockedUntil'}, 'date']},
          },
        },
      ],
      {
        hint: JOB_ACQUISITION_HINTS[hint],
        sort: JOB_ACQUISITION_SORT,
      },
    )

    if (result.matchedCount === 0) return

    const job = await rawCollection.findOne({lockId: executionId})
    if (!job) return

    return this.toJobToRun(job, executionId, lockTime, job.tries || 0, Boolean(job.claimWasStale))
  }

  private toJobToRun(
    job: JobRecord,
    executionId: string,
    lockTime: number,
    tries: number,
    wasStale: boolean,
  ): JobToRun {
    if (wasStale) {
      logger.info(`Running job "${job.jobName}" that was staled`)
    }

    return {
      jobId: job._id,
      executionId,
      lockId: executionId,
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

  async getJobAcquisitionExecutionTime(
    jobNames: string[],
    hint: JobAcquisitionHint,
    partition = 0,
  ): Promise<number> {
    const explain = await this.jobs
      .find(getJobAcquisitionSelector(jobNames, new Date(), partition), {
        hint: JOB_ACQUISITION_HINTS[hint],
        maxTimeMS: 1000,
        readPreference: 'primary',
      })
      .sort(JOB_ACQUISITION_SORT)
      .limit(1)
      .explain('executionStats')

    const executionTimeMillis = explain.executionStats?.executionTimeMillis
    if (typeof executionTimeMillis !== 'number' || !Number.isFinite(executionTimeMillis)) {
      throw new Error(`Explain for acquisition hint "${hint}" returned no execution time`)
    }

    return executionTimeMillis
  }

  async setJobRecordPriority(jobId: string, priority: number, lockId?: string) {
    const result = await this.jobs.updateOne(lockId ? {_id: jobId, lockId} : jobId, {
      $set: {priority},
    })
    return result.matchedCount > 0
  }

  async scheduleNextRun(options: {
    jobId: string
    nextRunAt: Date
    resetTries: boolean
    priority: number
    lockId?: string
  }) {
    const updator: MongoDB.UpdateFilter<JobRecord> = {
      $set: {
        nextRunAt: options.nextRunAt,
        priority: options.priority,
        ...(options.resetTries ? {tries: 0} : {}),
      },
      $unset: {lockId: '', lockedUntil: '', claimWasStale: ''},
    }

    const result = await this.jobs.updateOne(
      options.lockId ? {_id: options.jobId, lockId: options.lockId} : options.jobId,
      updator,
    )
    return result.matchedCount > 0
  }

  async deleteEventJob(jobId: string, lockId?: string) {
    const result = await this.jobs.deleteOne({
      _id: jobId,
      type: 'event',
      ...(lockId ? {lockId} : {}),
    })
    return result.deletedCount > 0
  }

  /**
   * Marks an event job as having reached its maximum tries limit.
   * The job won't be picked up for execution and MongoDB will delete it after
   * the configured retention period.
   */
  async markJobAsMaxTriesReached(
    jobId: string,
    retentionMs: number | null = DEFAULT_MAX_TRIES_REACHED_RETENTION_MS,
    lockId?: string,
  ) {
    const maxTriesReachedAt = new Date()
    const result = await this.jobs.updateOne(
      {_id: jobId, type: 'event', ...(lockId ? {lockId} : {})},
      {
        $set: {
          status: 'maxTriesReached',
          maxTriesReachedAt,
          ...(retentionMs === null
            ? {}
            : {expiresAt: new Date(maxTriesReachedAt.getTime() + retentionMs)}),
        },
        $unset: {
          lockId: '',
          lockedUntil: '',
          claimWasStale: '',
          ...(retentionMs === null ? {expiresAt: ''} : {}),
        },
      },
    )
    return result.matchedCount > 0
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

  async extendLockTime(jobId: string, extraTime: number, lockId?: string) {
    return this.updateLockTime(jobId, extraTime, lockId)
  }

  /**
   * Updates the lock time for a job to the specified duration from now.
   * Can be used to both extend or shorten the lock time.
   */
  async updateLockTime(jobId: string, lockDuration: number, lockId?: string) {
    const lockedUntil = new Date(Date.now() + lockDuration)
    const result = await this.jobs.updateOne(
      {_id: jobId, ...(lockId ? {lockId} : {})},
      {
        $set: {lockedUntil},
      },
    )
    return result.matchedCount > 0
  }

  async unlockAllJobs(): Promise<number> {
    const result = await this.jobs.updateMany(
      {
        lockedUntil: {$exists: true},
      },
      {
        $unset: {lockId: '', lockedUntil: '', claimWasStale: ''},
      },
    )

    return result.modifiedCount
  }

  async ensureJobRecord(job: JobDefinitionWithName, partition = 0) {
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
          partition,
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
        ...(options.partition === undefined ? {} : {partition: options.partition}),
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
          ...(job.partition === undefined ? {} : {partition: job.partition}),
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

  async reconcilePartitions(options: {
    jobNames: string[]
    nPartitions: number
    batchSize: number
  }): Promise<number> {
    if (options.jobNames.length === 0) return 0

    const rawCollection = await this.jobs.getRawCollection()
    await this.jobs.createIndexesPromise
    const now = new Date()
    const invalidPartition: MongoDB.Filter<JobRecord> = {
      $or: [
        {partition: {$exists: false}},
        {partition: {$lt: 0}},
        {partition: {$gte: options.nPartitions}},
      ],
    }
    const availableLock: MongoDB.Filter<JobRecord> = {
      $or: [{lockedUntil: {$exists: false}}, {lockedUntil: {$lte: now}}],
    }
    const runnableJob: MongoDB.Filter<JobRecord> = {
      $or: [{type: {$ne: 'event'}}, {status: {$ne: 'maxTriesReached'}}],
    }

    const jobs = await rawCollection
      .find({
        jobName: {$in: options.jobNames},
        $and: [invalidPartition, availableLock, runnableJob],
      })
      .project({_id: 1})
      .limit(options.batchSize)
      .toArray()

    if (jobs.length === 0) return 0

    const result = await rawCollection.bulkWrite(
      jobs.map(job => ({
        updateOne: {
          filter: {
            _id: job._id,
            $and: [invalidPartition, availableLock, runnableJob],
          },
          update: {$set: {partition: getRandomPartition(options.nPartitions)}},
        },
      })),
      {ordered: false},
    )

    return result.modifiedCount
  }
}
