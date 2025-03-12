import {StartGraphQLOptions} from '../types/startGraphQL'
import {Schema} from '@orion-js/schema'

export function getModelLoadedResolvers(schema: Schema, options: StartGraphQLOptions): any[] {
  if (!options.modelResolvers) return []
  const resolvers = options.modelResolvers[schema.__modelName]
  if (!resolvers) return []

  const keys = Object.keys(resolvers)

  return keys
    .map(key => {
      const resolver = resolvers[key]
      return {
        ...resolver,
        key,
      }
    })
    .filter(resolver => !resolver.private)
}
