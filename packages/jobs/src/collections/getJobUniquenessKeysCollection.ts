import {TypedModel, Prop} from '@orion-js/typed-model'
import {createCollection, Collection} from '@orion-js/mongodb'

@TypedModel()
export class JobUniquenessKey {
  @Prop()
  key: string
}

let collection = null

export const getJobUniquenessKeysCollection = (
  connectionName?: string
): Collection<JobUniquenessKey> => {
  if (collection) return collection

  collection = createCollection<JobUniquenessKey>({
    name: 'orion_v3_jobs.uniqueness_keys',
    model: JobUniquenessKey,
    connectionName,
    indexes: [
      {
        keys: {key: 1},
        options: {
          unique: true
        }
      }
    ]
  })

  return collection
}
