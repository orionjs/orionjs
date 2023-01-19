import {ResolverMiddleware} from '@orion-js/resolvers'
import {GlobalResolverPropertyDescriptor} from './global'
import {ModelResolverPropertyDescriptor} from './model'

export function UseMiddleware(middleware: ResolverMiddleware) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: GlobalResolverPropertyDescriptor | ModelResolverPropertyDescriptor
  ) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.middlewares = target.middlewares || {}
    target.middlewares[propertyKey] = target.middlewares[propertyKey] || []
    // push at the start of the array
    target.middlewares[propertyKey].unshift(middleware)
  }
}

export function createResolverServiceMiddleware(middleware: ResolverMiddleware) {
  return UseMiddleware(middleware)
}
