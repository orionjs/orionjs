import resolver from '../../controllers/resolver'
import Model from '../../Model'
import UserError from '../../Errors/UserError'
import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'

const Params = new Model({
  name: 'Params',
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
  name: 'params',
  params: {
    name: {
      type: 'ID'
    },
    mutation: {
      type: Boolean
    }
  },
  returns: Params,
  mutation: false,
  resolve: async function({mutation, name}, viewer) {
    const resolver = global.graphQLResolvers[name]
    if (!resolver) {
      throw new UserError('notFound', 'Query or Mutation not found')
    }
    return resolver
  }
})
