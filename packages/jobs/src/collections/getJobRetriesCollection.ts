import {TypedModel, Prop} from '@orion-js/typed-model'
import {createCollection, Collection} from '@orion-js/mongodb'

@TypedModel()
export class JobRetry {
  @Prop()
  jobId: string

  @Prop()
  totalRetries: number
}

let collection = null

export const getJobRetriesCollection = (connectionName?: string): Collection<JobRetry> => {
  if (collection) return collection

  collection = createCollection<JobRetry>({
    name: 'orion_v3_jobs.retries',
    model: JobRetry,
    connectionName,
    indexes: [
      {
        keys: {jobId: 1},
        options: {}
      }
    ]
  })

  return collection
}
