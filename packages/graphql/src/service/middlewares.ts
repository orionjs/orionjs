import {Resolver, ResolverMiddleware} from '@orion-js/resolvers'
import {InternalDynamicResolverResolveAtDecorator} from './types'

const resolversMetadata = new WeakMap<any, Record<string, any>>()

function createRegisterResolverMetadata<TParam>(metadataKey: string, isArray = false) {
  return <TResolver extends Resolver['resolve']>(metadata: TParam) => {
    return (method: TResolver, context: ClassMethodDecoratorContext) => {
      const propertyKey = String(context.name)
      addTargetMetadata(method, propertyKey, metadataKey, metadata, isArray)
      return method
    }
  }
}

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

export const UseMiddleware = createRegisterResolverMetadata<ResolverMiddleware>('middlewares', true)

export function ResolverParams<TParams, This>(params: TParams) {
  return (
    method: InternalDynamicResolverResolveAtDecorator<This, TParams>,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)
    addTargetMetadata(method, propertyKey, 'params', params, false)
    return method
  }
}

export function ResolverReturns<TReturns, This>(returns: TReturns) {
  return (
    method: InternalDynamicResolverResolveAtDecorator<This, any, TReturns>,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)
    addTargetMetadata(method, propertyKey, 'returns', returns, false)
    return method
  }
}
