import {Model} from '@orion-js/app'
import schema from './schema'
import resolvers from './resolvers'

export default new Model({
  name: 'StripeProduct',
  schema,
  resolvers
})
