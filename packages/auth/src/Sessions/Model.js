import {Model} from '@orion-js/app'
import resolvers from './resolvers'
import schema from './schema'

export default options =>
  new Model({
    name: 'Session',
    schema,
    resolvers: resolvers(options)
  })
