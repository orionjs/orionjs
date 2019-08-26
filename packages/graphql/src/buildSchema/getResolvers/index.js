import getType from '../getType'
import getArgs from '../getArgs'

global.graphQLResolvers = {}

export default async function({resolvers, mutation}) {
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

    const type = await getType(resolver.returns)
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
          throw error
        }
      }
    }
  }

  return fields
}
