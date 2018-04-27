import values from 'lodash/values'
import flatten from 'lodash/flatten'
import getType from './getType'

export default async function({controllers, mutation}) {
  const resolvers = flatten(
    values(controllers).map(controller => values(controller.resolvers))
  ).filter(resolver => !!resolver.mutation === !!mutation)

  const fields = {}

  for (const resolver of resolvers) {
    const type = await getType(resolver.returns)
    fields[resolver.name] = {
      type,
      async resolve(root, params, context) {
        const result = await resolver.resolve(params, context)
        return result
      }
    }
  }

  return fields
}
