import {Collection, Model} from '@orion-js/app'
import schema from './schema'

export default new Collection({
  name: 'orion_job_events',
  indexes: [{keys: {job: 1, identifier: 1}, options: {unique: true}}, {keys: {createdAt: -1}}],
  model: new Model({
    name: 'OrionJob',
    schema
  })
})
