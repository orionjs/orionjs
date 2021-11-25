import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'
import {createModel, Model} from '@orion-js/models'
import {Resolver, resolver} from '@orion-js/resolvers'

export interface ResolverMetaParam {
  resolver: {
    params: any
    returns: Model | any
  }
}

const resolverReturnsIsModel = (returns: Model | any): returns is Model => {
  return returns && returns.__isModel
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
        return await getBasicResultQuery({
          type: resolverReturnsIsModel(resolver.returns) ? resolver.returns.getSchema() : ''
        })
      }
    })
  }
})
