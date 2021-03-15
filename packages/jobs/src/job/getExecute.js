import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default function (job) {
  return async (params, jobData) => {
    try {
      const result = {}
      try {
        params = job.type === 'recurrent' ? jobData : params
        // eslint-disable-next-line
        result.result = await job.run.call(job, params, jobData)
      } catch (error) {
        console.log('Error running job:', error)
        result.error = error
      }

      if (job.type === 'recurrent') {
        const previousInfo = {...result, date: jobData.runAfter, endedAt: new Date()}

        await JobsCollection.upsert(
          {job: job.identifier},
          {
            $set: {
              lockedAt: null,
              identifier: generateId(),
              runAfter: await job.getNextRun(previousInfo),
              priority: job.priority
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
