import values from 'lodash/values'
import flatten from 'lodash/flatten'
import getType from '../getType'
import getArgs from '../getArgs'

global.graphQLResolvers = {}

export default async function({controllers, mutation}) {
  const resolvers = flatten(values(controllers).map(controller => values(controller.resolvers)))
    .filter(resolver => !!resolver.mutation === !!mutation)
    .filter(resolver => !resolver.private)

  const fields = {}

  for (const resolver of resolvers) {
    global.graphQLResolvers[resolver.name] = resolver

    const type = await getType(resolver.returns)
    const args = await getArgs(resolver.params)
    fields[resolver.name] = {
      type,
      args,
      async resolve(root, params, context) {
        const result = await resolver.resolve(params, context)
        return result
      }
    }
  }

  return fields
}
