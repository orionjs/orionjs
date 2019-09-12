import getType from '../getType'
import getArgs from '../getArgs'
import reportError from '../../reportError'

global.graphQLResolvers = {}

export default async function({resolvers, mutation, options}) {
  const filteredResolvers = Object.keys(resolvers)
    .map(key => {
      return {
        name: key,
        resolver: resolvers[key]
      }
    })
    .filter(({resolver}) => !!resolver.mutation === !!mutation)
    .filter(({resolver}) => !resolver.private)

  const fields = {}

  for (const {resolver, name} of filteredResolvers) {
    global.graphQLResolvers[name] = resolver

    const type = await getType(resolver.returns, options)
    const args = await getArgs(resolver.params)

    fields[name] = {
      type,
      args,
      async resolve(root, params, context) {
        try {
          const result = await resolver(params, context)
          return result
        } catch (error) {
          console.error('Error at resolver "' + name + '":')
          console.error(error)
          reportError(options, error, {
            user: context.userId,
            websiteId: context.websiteId,
            resolver: resolver.key
          })

          throw error
        }
      }
    }
  }

  return fields
}
