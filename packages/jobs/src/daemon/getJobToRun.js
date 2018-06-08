import JobsCollection from '../JobsCollection'
import {DateTime} from 'luxon'

const defaultLockTime = {
  minutes: 10
}

export default async function() {
  const job = await JobsCollection.findOneAndUpdate(
    {
      $or: [
        {
          lockedAt: null
        },
        {
          lockedAt: {
            $lte: DateTime.local()
              .minus(defaultLockTime)
              .toJSDate()
          }
        }
      ]
    },
    {
      $set: {lockedAt: new Date()}
    }
  )

  return job
}
