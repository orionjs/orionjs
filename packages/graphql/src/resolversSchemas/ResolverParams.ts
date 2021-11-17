import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'
import {createModel, Model} from '@orion-js/models'
import {Resolver, resolver} from '@orion-js/resolvers'

export interface ResolverMetaParam {
  resolver: {
    params: any
    returns: Model
  }
}

export default createModel({
  name: 'ResolverParams',
  schema: {
    name: {
      type: String
    }
  },
  resolvers: {
    params: resolver({
      returns: 'blackbox',
      resolve: async function ({resolver}: ResolverMetaParam) {
        return await serializeSchema(resolver.params)
      }
    }),
    result: resolver({
      returns: String,
      resolve: async function ({resolver}: ResolverMetaParam) {
        return resolver.returns.name
      }
    }),
    basicResultQuery: resolver({
      returns: String,
      resolve: async function ({resolver}: ResolverMetaParam) {
        return await getBasicResultQuery({type: resolver.returns.getSchema()})
      }
    })
  }
})
