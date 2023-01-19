import {ResolverMiddleware} from '@orion-js/resolvers'
import {GlobalResolverPropertyDescriptor} from './global'
import {ModelResolverPropertyDescriptor} from './model'

function createRegisterResolverMetadata<TParam>(metadataKey: string, isArray = false) {
  return (metadata: TParam) => {
    return function (
      target: any,
      propertyKey: string,
      descriptor: GlobalResolverPropertyDescriptor | ModelResolverPropertyDescriptor
    ) {
      if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

      target[metadataKey] = target[metadataKey] || {}
      if (isArray) {
        target[metadataKey][propertyKey] = target[metadataKey][propertyKey] || []
        // push at the start of the array
        target[metadataKey][propertyKey].unshift(metadata)
      } else {
        target[metadataKey][propertyKey] = metadata
      }
    }
  }
}

export function getTargetMetadata(target: any, propertyKey: string, metadataKey: string) {
  const items = target[metadataKey] || {}
  return items[propertyKey] || []
}

export const UseMiddleware = createRegisterResolverMetadata<ResolverMiddleware>('middlewares', true)
export const ResolverParams = createRegisterResolverMetadata<any>('params')
export const ResolverReturns = createRegisterResolverMetadata<any>('returns')
