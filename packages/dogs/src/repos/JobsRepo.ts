import {createCollection, ModelToUpdateFilter} from '@orion-js/mongodb'
import {Service} from '@orion-js/services'
import {log} from '../log'
import {ScheduleJobRecordOptions} from '../types/Events'
import {JobRecord} from '../types/JobRecord'
import {JobDefinitionWithName, RecurrentJobDefinition} from '../types/JobsDefinition'
import {JobToRun} from '../types/Worker'

@Service()
export class JobsRepo {
  private jobs = createCollection<JobRecord>({
    name: 'orionjs.jobs_dogs',
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
          partialFilterExpression: {isRecurrent: true}
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
        $set: {lockedUntil}
      },
      {
        mongoOptions: {
          sort: {
            priority: 1,
            nextRunAt: 1
          }
        }
      }
    )

    if (!job) return

    return {
      jobId: job._id,
      name: job.jobName,
      params: job.params,
      isRecurrent: job.isRecurrent,
      tries: job.tries || 1,
      lockTime
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
          isRecurrent: true,
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
    const jobId = await this.jobs.insertOne({
      jobName: options.name,
      params: options.params,
      nextRunAt: options.nextRunAt,
      priority: options.priority,
      isRecurrent: false
    })
  }
}
