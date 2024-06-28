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
    if (Array.isArray(jobs)) this.jobs = jobs
    else this.jobs = Object.keys(jobs)
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

  getStats() {
    return JobsCollection.aggregate([
      {
        $match: {job: {$in: this.jobs}}
      },
      {
        $group: {
          _id: {
            $cond: [ 
              {
                $gt: ['$runAfter', DateTime.local().minus({minutes: 1}).toJSDate()]
              },
              'delayed',
              {
                $cond: [
                  {
                    $lte: ['$lockedAt', DateTime.local().minus(defaultLockTime).toJSDate()]
                  },
                  'pending',
                  'running'
                ]
              }
            ]
          },
          total: {$sum: 1}
        }
      }
    ])
      .toArray()
      .then(arr => {
        return arr.reduce((obj, current) => ({[current._id]: current.total, ...obj}), {})
      })
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
