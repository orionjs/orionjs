import {Model} from '@orion-js/models'

export function getDynamicFields(model: Model): any {
  const resolvers = model.getResolvers()
  if (!resolvers) return []
  const keys = Object.keys(resolvers)

  return keys
    .map(key => {
      const resolver = resolvers[key]
      return {
        ...resolver,
        key
      }
    })
    .filter(resolver => !resolver.private)
}
