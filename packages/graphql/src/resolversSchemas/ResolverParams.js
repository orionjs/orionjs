import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'
import {Model, resolver} from '@orion-js/app'

export default new Model({
  name: 'ResolverParams',
  schema: {
    name: {
      type: String
    }
  },
  resolvers: {
    params: resolver({
      returns: 'blackbox',
      resolve: async function ({resolver}) {
        return await serializeSchema(resolver.params)
      }
    }),
    result: resolver({
      returns: String,
      resolve: async function ({resolver}) {
        return resolver.returns.name
      }
    }),
    basicResultQuery: resolver({
      returns: String,
      resolve: async function ({resolver}) {
        return await getBasicResultQuery({type: resolver.returns.schema})
      }
    })
  }
})
