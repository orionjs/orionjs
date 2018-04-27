import {Model} from '@orion-js/app'
import resolvers from './resolvers'
import schema from './schema'

export default new Model({
  name: 'Post',
  schema,
  resolvers
})
