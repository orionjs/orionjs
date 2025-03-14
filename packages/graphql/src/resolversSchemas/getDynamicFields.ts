import {Model, ModelResolversMap} from '@orion-js/models'
import {Schema} from '@orion-js/schema'

function getResolvers(schema: Schema | Model): ModelResolversMap {
  if (typeof schema.getResolvers === 'function') {
    console.warn('Models are deprecated')
    return (schema as Model).getResolvers()
  }

  if ((schema as any).__resolvers) {
    return (schema as any).__resolvers
  }

  return {}
}

export function getDynamicFields(schema: Schema): any {
  const resolvers = getResolvers(schema as any)
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
