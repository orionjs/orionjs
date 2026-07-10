import {SchemaWithMetadata} from '@orion-js/schema'
import {StartGraphQLOptions} from '../types/startGraphQL'

export function getModelLoadedResolvers(
  schema: SchemaWithMetadata,
  options: StartGraphQLOptions,
): any[] {
  if (!options.modelResolvers) return []
  if (!schema.__modelName) return []
  const resolvers = options.modelResolvers[schema.__modelName]
  if (!resolvers) return []

  const keys = Object.keys(resolvers)

  return keys
    .map(key => {
      const resolver = resolvers[key]
      const namedResolver = resolver as typeof resolver & {resolverName: string}
      namedResolver.resolverName = key
      return {
        ...namedResolver,
        key,
      }
    })
    .filter(resolver => !resolver.private)
}
