import resolver from '../../resolvers/resolver'
import Model from '../../Model'
import UserError from '../../Errors/UserError'
import serializeSchema from './serializeSchema'
import getBasicResultQuery from './getBasicResultQuery'

const Params = new Model({
  name: 'Params',
  schema: {},
  resolvers: {
    name: resolver({
      returns: String,
      resolve: async function(resolver) {
        return resolver.name
      }
    }),
    params: resolver({
      returns: 'blackbox',
      resolve: async function(resolver) {
        return await serializeSchema(resolver.params)
      }
    }),
    result: resolver({
      returns: String,
      resolve: async function(resolver) {
        return resolver.returns.name
      }
    }),
    basicResultQuery: resolver({
      returns: String,
      resolve: async function(resolver) {
        return await getBasicResultQuery({type: resolver.returns.schema})
      }
    })
  }
})

export default resolver({
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
      throw new UserError(
        'notFound',
        `${mutation ? 'Mutation' : 'Query'} named "${name}" not found`
      )
    }
    return resolver
  }
})
