import JobsCollection from '../JobsCollection'
import {DateTime} from 'luxon'
import lockConfig from '../lockConfig'

const defaultLockTime = {
  minutes: lockConfig.lockDuration
}

const deleteUnclaimedJobsTime = {
  days: 7
}

class JobRepository {
  setJobs(jobs) {
    this.jobs = jobs
  }
  getJobAndLock() {
    return JobsCollection.findOneAndUpdate(
      {
        runAfter: {$lte: new Date()},
        job: {$in: this.jobs},
        $or: [
          {
            lockedAt: null
          },
          {
            lockedAt: {
              $lte: DateTime.local().minus(defaultLockTime).toJSDate()
            }
          }
        ]
      },
      {
        $set: {lockedAt: new Date()}
      },
      {
        sort: {runAfter: 1}
      }
    )
  }

  getPendingJobsCount() {
    return JobsCollection.find({
      runAfter: {$lte: new Date()},
      job: {$in: this.jobs},
      $or: [
        {
          lockedAt: null
        },
        {
          lockedAt: {
            $lte: DateTime.local().minus(defaultLockTime).toJSDate()
          }
        }
      ]
    }).count()
  }

  getRunningJobsCount() {
    return JobsCollection.find({
      job: {$in: this.jobs},
      lockedAt: {
        $gt: DateTime.local().minus(defaultLockTime).toJSDate()
      }
    }).count()
  }

  getDelayedJobsCount() {
    return JobsCollection.find({
      job: {$in: this.jobs},
      runAfter: {$gt: new Date()},
      lockedAt: null
    }).count()
  }

  deleteUnclaimedJobs() {
    // Unclaimed jobs are those that are not in our scope of valid jobs, and also that have not been executed by any other worker in a long time.
    return JobsCollection.deleteMany({
      runAfter: {$lte: DateTime.local().minus(deleteUnclaimedJobsTime).toJSDate()},
      job: {$nin: this.jobs}
    })
  }
}

export default new JobRepository()
