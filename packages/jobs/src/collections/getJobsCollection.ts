import {TypedModel, Prop} from '@orion-js/typed-model'
import {createCollection, Collection} from '@orion-js/mongodb'

@TypedModel()
export class Job {
  @Prop({type: 'ID'})
  _id: string

  @Prop()
  name: string
}

let collection = null

export const getJobCollection = (
  connectionName?: string,
  dbCollection = 'orion_v3_jobs'
): Collection<Job> => {
  if (collection) return collection

  collection = createCollection<Job>({
    name: dbCollection,
    model: Job,
    connectionName
  })

  return collection
}
