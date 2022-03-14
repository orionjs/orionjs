import {createCollection, ModelToUpdateFilter} from '@orion-js/mongodb'
import {Service} from '@orion-js/services'
import {log} from '../log'
import {ScheduleJobRecordOptions} from '../types/Events'
import {JobRecord} from '../types/JobRecord'
import {JobDefinitionWithName, RecurrentJobDefinition} from '../types/JobsDefinition'
import {JobToRun} from '../types/Worker'

@Service()
export class JobsRepo {
  public jobs = createCollection<JobRecord>({
    name: 'orionjs.jobs_dogs_records',
    model: JobRecord,
    indexes: [
      {
        keys: {
          jobName: 1,
          nextRunAt: 1,
          priority: 1,
          lockedUntil: 1
        }
      },
      {
        keys: {
          jobName: 1
        },
        options: {
          unique: true,
          partialFilterExpression: {type: 'recurrent'}
        }
      },
      {
        keys: {
          uniqueIdentifier: 1
        },
        options: {
          unique: true,
          sparse: true
        }
      }
    ]
  })

  async getJobAndLock(jobNames: string[], lockTime: number): Promise<JobToRun> {
    const lockedUntil = new Date(Date.now() + lockTime)
    const job = await this.jobs.findOneAndUpdate(
      {
        jobName: {$in: jobNames},
        nextRunAt: {$lte: new Date()},
        $or: [{lockedUntil: {$exists: false}}, {lockedUntil: {$lte: new Date()}}]
      },
      {
        $set: {lockedUntil, lastRunAt: new Date()}
      },
      {
        mongoOptions: {
          sort: {
            priority: 1,
            nextRunAt: 1
          },
          returnDocument: 'before'
        }
      }
    )

    if (!job) return

    let tries = job.tries || 1

    if (job.lockedUntil) {
      log('debug', `Running job "${job.jobName}" that was staled`)
      this.jobs.updateOne(job._id, {$inc: {tries: 1}})
      tries++
    }

    return {
      jobId: job._id,
      name: job.jobName,
      params: job.params,
      type: job.type,
      tries,
      lockTime,
      priority: job.priority,
      uniqueIdentifier: job.uniqueIdentifier
    }
  }

  async scheduleNextRun(options: {jobId: string; nextRunAt: Date; addTries: boolean}) {
    const updator: ModelToUpdateFilter<JobRecord> = {
      $set: {nextRunAt: options.nextRunAt},
      $unset: {lockedUntil: ''}
    }

    if (options.addTries) {
      updator.$inc = {tries: 1}
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
        _id: jobId
      },
      {
        $set: {lockedUntil}
      }
    )
  }

  async ensureJobRecord(job: JobDefinitionWithName) {
    const result = await this.jobs.upsert(
      {
        jobName: job.name
      },
      {
        $set: {
          type: job.type,
          priority: (job as RecurrentJobDefinition).priority || 1
        },
        $setOnInsert: {
          nextRunAt: new Date()
        }
      }
    )

    if (result.upsertedId) {
      log('debug', `Created job record for "${job.name}"`)
    } else {
      log('debug', `Record for job "${job.name}" already exists`)
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
        type: 'event'
      })
    } catch (error) {
      if (error.code === 11000 && options.uniqueIdentifier) {
        log(
          'info',
          `Job "${options.name}" with identifier "${options.uniqueIdentifier}" already exists`
        )
      } else {
        throw error
      }
    }
  }
}
