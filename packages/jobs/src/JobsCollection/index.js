import {Collection} from '@orion-js/app'

export default new Collection({
  name: 'orion_job_events',
  model: null,
  indexes: [{keys: {job: 1, identifier: 1}, options: {unique: true}}, {keys: {createdAt: -1}}]
})
