import {Schema, Prop, getModelForClass} from '@orion-js/typed-model'
import {createCollection} from '@orion-js/mongodb'
import {} from '@orion-js/typed-model'

@Schema()
export class JobRetry {
  @Prop()
  jobId: string

  @Prop()
  totalRetries: number
}

export const JobRetries = createCollection<JobRetry>({
  name: 'orion_v3_jobs.retries',
  model: getModelForClass(JobRetry),
  indexes: [
    {
      keys: {jobId: 1},
      options: {}
    }
  ]
})

export default JobRetries
