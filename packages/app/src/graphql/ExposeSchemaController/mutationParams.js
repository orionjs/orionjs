import resolver from '../../controllers/resolver'
import Model from '../../Model'
import UserError from '../../Errors/UserError'
import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'

const MutationParams = new Model({
  name: 'MutationParams',
  schema: {},
  resolvers: {
    name: resolver({
      name: 'name',
      returns: String,
      resolve: async function(resolver) {
        return resolver.name
      }
    }),
    params: resolver({
      name: 'params',
      returns: 'blackbox',
      resolve: async function(resolver) {
        return await serializeSchema(resolver.params)
      }
    }),
    result: resolver({
      name: 'result',
      returns: String,
      resolve: async function(resolver) {
        return resolver.returns.name
      }
    }),
    basicResultQuery: resolver({
      name: 'basicResultQuery',
      returns: String,
      resolve: async function(resolver) {
        return await getBasicResultQuery({type: resolver.returns.schema})
      }
    })
  }
})

export default resolver({
  name: 'mutationParams',
  params: {
    name: {
      type: 'ID'
    }
  },
  returns: MutationParams,
  mutation: false,
  resolve: async function({mutation, name}, viewer) {
    const resolver = global.graphQLResolvers[name]
    if (!resolver) {
      throw new UserError('mutationNotFound', 'Mutation not found')
    }
    return resolver
  }
})
