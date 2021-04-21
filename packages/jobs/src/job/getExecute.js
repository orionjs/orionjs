import JobsCollection from '../JobsCollection'
import {generateId, config} from '@orion-js/app'

export default function (job) {
  const {logger} = config()
  return async (params, jobData) => {
    try {
      const startedAt = new Date()
      const result = {}
      try {
        params = job.type === 'recurrent' ? jobData : params
        // eslint-disable-next-line
        result.result = await job.run.call(job, params, jobData)
      } catch (error) {
        logger.error('Error running job:', error)
        result.error = error
      }

      if (job.type === 'recurrent') {
        const previousInfo = {...result, date: startedAt, endedAt: new Date()}

        await JobsCollection.upsert(
          {job: job.identifier},
          {
            $set: {
              lockedAt: null,
              identifier: generateId(),
              runAfter: await job.getNextRun(previousInfo),
              ...(job.persistResults && !result.error && result.result
                ? {result: result.result}
                : {})
            }
          }
        )
      } else {
        await JobsCollection.remove(jobData._id)
      }

      return result
    } catch (error) {
      logger.error(`Error running job named "${jobData.job}"`, error)
    }
  }
}
