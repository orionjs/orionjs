import {createCollection} from '@orion-js/mongodb'
import {Service} from '@orion-js/services'
import {JobRecord} from '../types/JobRecord'
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
      params: job.params
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
}
