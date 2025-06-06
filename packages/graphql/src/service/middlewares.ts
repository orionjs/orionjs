import {ResolverMiddleware} from '@orion-js/resolvers'
import {SchemaInAnyOrionForm} from '@orion-js/schema'

const resolversMetadata = new WeakMap<any, Record<string, any>>()

function addTargetMetadata(
  target: any,
  propertyKey: string,
  metadataKey: string,
  metadata: any,
  isArray = false,
) {
  const targetMetadata = resolversMetadata.get(target) || {}
  targetMetadata[propertyKey] = targetMetadata[propertyKey] || {}

  if (isArray) {
    targetMetadata[propertyKey][metadataKey] = targetMetadata[propertyKey][metadataKey] || []
    targetMetadata[propertyKey][metadataKey].unshift(metadata)
  } else {
    targetMetadata[propertyKey][metadataKey] = metadata
  }

  resolversMetadata.set(target, targetMetadata)
}

export function getTargetMetadata(target: any, propertyKey: string, metadataKey: string) {
  const targetMetadata = resolversMetadata.get(target) || {}
  return targetMetadata[propertyKey]?.[metadataKey]
}

export function UseMiddleware<TMiddleware extends ResolverMiddleware, This>(params: TMiddleware) {
  return (method: any, context: ClassMethodDecoratorContext<This, typeof method>) => {
    const propertyKey = String(context.name)
    addTargetMetadata(method, propertyKey, 'middlewares', params, true)
    return method
  }
}

export function ResolverParams<TParams extends SchemaInAnyOrionForm, This>(params: TParams) {
  return (method: any, context: ClassMethodDecoratorContext<This, typeof method>) => {
    const propertyKey = String(context.name)
    addTargetMetadata(method, propertyKey, 'params', params, false)
    return method
  }
}

export function ResolverReturns<This>(returns: any) {
  return (method: any, context: ClassMethodDecoratorContext<This, typeof method>) => {
    const propertyKey = String(context.name)
    addTargetMetadata(method, propertyKey, 'returns', returns, false)
    return method
  }
}
