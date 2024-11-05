import JobsCollection from '../JobsCollection'
import defaultGetNextRun from '../helpers/defaultGetNextRun'
import { generateId, config } from '@orion-js/app'
const { SpanStatusCode } = require('@opentelemetry/api');
const { trace } = require('@opentelemetry/api');



export default function (job) {
  const { logger } = config()
  const tracer = trace.getTracer(
    'orionjs.jobs',
    '1.0',
  );
  return async (params, jobData) => {
    tracer.startActiveSpan(`job.${job.identifier}`, async (span) => {
      try {
        const startedAt = new Date()
        const result = {}
        try {
          params = job.type === 'recurrent' ? jobData : params
          // eslint-disable-next-line
          result.result = await job.run.call(job, params, jobData)
        } catch (error) {
          if (error.isUserError) {
            logger.warn('UserError running job:', { error, jobData })
          } else {
            logger.error('Error running job:', { error, jobData })
          }
          result.error = error
        }

        if (job.type === 'recurrent') {
          const previousInfo = { ...result, date: startedAt, endedAt: new Date() }

          await JobsCollection.upsert(
            { job: job.identifier },
            {
              $set: {
                lockedAt: null,
                identifier: generateId(),
                runAfter: await job.getNextRun(previousInfo),
                ...(job.persistResults && !result.error && result.result
                  ? { result: result.result }
                  : {})
              }
            }
          )
        } else {
          if (result.error && job.maxRetries > jobData.timesExecuted) {
            const timesExecuted = (jobData.timesExecuted || 0) + 1
            const getNextRun = job.getNextRun || defaultGetNextRun
            await JobsCollection.updateOne(
              { job: jobData.job, identifier: jobData.identifier },
              {
                $set: {
                  lockedAt: null,
                  runAfter: await getNextRun({ ...jobData, result, timesExecuted }),
                  timesExecuted
                }
              }
            )
          } else {
            await JobsCollection.remove(jobData._id)
          }
        }

        return result
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        });
        logger.error(`Error running job named "${jobData.job}"`, error)
      } finally {
        span.end();
      }
    })
  }
}
