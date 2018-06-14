import resolver from '../../resolvers/resolver'
import UserError from '../../Errors/UserError'

import ResolverParams from './ResolverParams'

export default resolver({
  params: {
    name: {
      type: 'ID'
    },
    mutation: {
      type: Boolean
    }
  },
  returns: ResolverParams,
  mutation: false,
  resolve: async function({mutation, name}, viewer) {
    const resolver = global.graphQLResolvers[name]
    if (!resolver) {
      throw new UserError(
        'notFound',
        `${mutation ? 'Mutation' : 'Query'} named "${name}" not found`
      )
    }
    if (!!resolver.mutation !== !!mutation) {
      throw new UserError('incorrectType', `"${name}" is ${mutation ? 'not' : ''} a mutation`)
    }
    return {resolver, name}
  }
})
