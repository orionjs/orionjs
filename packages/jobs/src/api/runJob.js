import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

/**
 * job: the name of the job
 * identifier: a unique string that indicates the job, its unique for a job execution
 * params: the params that will be passed to the job
 */
export default async function({job, identifier, params}) {
  identifier = identifier || generateId()

  const jobId = await JobsCollection.insert({
    job,
    identifier,
    params,
    createdAt: new Date()
  })

  return jobId
}
