import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'
import {createModel, Model} from '@orion-js/models'
import {Resolver, resolver} from '@orion-js/resolvers'
import {isArray} from 'lodash'

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
        const returns = isArray(resolver.returns) ? resolver.returns[0] : resolver.returns
        if (resolverReturnsIsModel(returns)) return returns.name
        return
      }
    }),
    basicResultQuery: resolver({
      returns: String,
      resolve: async function ({resolver}: ResolverMetaParam) {
        const returns = isArray(resolver.returns) ? resolver.returns[0] : resolver.returns
        return await getBasicResultQuery({
          type: resolverReturnsIsModel(returns) ? returns.getSchema() : ''
        })
      }
    })
  }
})
