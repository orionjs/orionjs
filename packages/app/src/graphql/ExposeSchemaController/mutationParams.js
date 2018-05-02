import resolver from '../../controllers/resolver'
import Model from '../../Model'
import UserError from '../../Errors/UserError'
import serializeSchema from './serializeSchema'

const MutationParams = new Model({
  name: 'MutationParams',
  schema: {
    name: {
      type: String
    },
    params: {
      type: 'blackbox'
    }
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
    const params = await serializeSchema(resolver.params)
    return {name, params}
  }
})
