import getType from '../getType'
import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'

global.graphQLResolvers = {}

export default async function ({resolvers, mutation, options}) {
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
          errorHandler(error, {context, resolver, options, name})
          throw error
        }
      }
    }
  }

  return fields
}
