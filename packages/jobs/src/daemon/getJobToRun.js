import JobsCollection from '../JobsCollection'
import {DateTime} from 'luxon'
import lockConfig from '../lockConfig'

const defaultLockTime = {
  minutes: lockConfig.lockDuration
}

export default async function () {
  const job = await JobsCollection.findOneAndUpdate(
    {
      runAfter: {$lte: new Date()},
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
      $set: {lockedAt: new Date(), lastExecution: new Date()}
    },
    {
      sort: {lastExecution: 1}
    }
  )

  return job
}
