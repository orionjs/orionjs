import {Model} from '@orion-js/app'

export default new Model({
  name: 'User',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
