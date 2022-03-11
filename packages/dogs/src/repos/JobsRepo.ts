import {createCollection} from '@orion-js/mongodb'
import {Service} from '@orion-js/services'
import {log} from '../log'
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

  async getJobAndLock(jobNames: string[]): Promise<JobToRun> {
    const defaultTimeout = 1000 * 60 * 5
    const lockedUntil = new Date(Date.now() + defaultTimeout)
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
      isRecurrent: job.isRecurrent
    }
  }

  async scheduleNextRun(options: {jobId: string; nextRunAt: Date}) {
    await this.jobs.updateOne(
      {
        _id: options.jobId
      },
      {
        $set: {nextRunAt: options.nextRunAt},
        $unset: {lockedUntil: ''}
      }
    )
  }

  async extendLockUntil(jobId: string, lockedUntil: Date) {
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
}
