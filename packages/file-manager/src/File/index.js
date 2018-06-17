import {Model} from '@orion-js/app'

export default new Model({
  name: 'File',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
