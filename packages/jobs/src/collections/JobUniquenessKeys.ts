import {TypedModel, Prop} from '@orion-js/typed-model'
import {createCollection} from '@orion-js/mongodb'

@TypedModel()
export class JobUniquenessKey {
  @Prop()
  key: string
}

export const JobUniquenessKeys = createCollection<JobUniquenessKey>({
  name: 'orion_v3_jobs.uniqueness_keys',
  model: JobUniquenessKey,
  indexes: [
    {
      keys: {key: 1},
      options: {
        unique: true
      }
    }
  ]
})

export default JobUniquenessKeys
