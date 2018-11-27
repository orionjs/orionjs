import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default function(job) {
  return async (params, jobData) => {
    try {
      // eslint-disable-next-line
      const result = await job.run.call(job, params, jobData)

      if (job.type === 'recurrent') {
        const previousInfo = {result: result, endedAt: new Date()}

        await JobsCollection.upsert(
          {job: job.identifier},
          {
            $set: {
              lockedAt: null,
              identifier: generateId(),
              runAfter: await job.getNextRun(previousInfo)
            }
          }
        )
      } else {
        await JobsCollection.remove(jobData._id)
      }

      return result
    } catch (error) {
      console.error(`Error running job named "${jobData.job}"`, error)
    }
  }
}
