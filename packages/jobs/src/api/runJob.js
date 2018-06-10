import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

/**
 * job: the name of the job
 * identifier: a unique string that indicates the job, its unique for a job execution
 * params: the params that will be passed to the job
 */
export default async function({job, identifier, params, waitToRun}) {
  identifier = identifier || generateId()

  let runAfter = new Date()
  if (waitToRun) {
    runAfter = new Date(Date.now() + waitToRun)
  }

  const jobId = await JobsCollection.insert({
    job,
    identifier,
    params,
    runAfter
  })

  return jobId
}
