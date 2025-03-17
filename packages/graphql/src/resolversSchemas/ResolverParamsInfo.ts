import {schemaWithName} from '@orion-js/schema'
export default schemaWithName('ResolverParams', {
  name: {
    type: 'string',
  },
  params: {
    type: 'blackbox',
  },
  result: {
    type: 'string',
  },
  basicResultQuery: {
    type: 'string',
  },
})
