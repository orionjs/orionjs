import {getInstance, Service} from '@orion-js/services'
import {GlobalResolverResolve, ResolverOptions, resolver, Resolver} from '@orion-js/resolvers'
import {UserError} from '@orion-js/helpers'

export function Resolvers(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export interface GlobalResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: GlobalResolverResolve
}

export function getTargetMiddlewares(target: any, propertyKey: string) {
  const middlewares = target.middlewares || {}
  return middlewares[propertyKey] || []
}

export function Query(options: Omit<ResolverOptions<any>, 'resolve' | 'mutation' | 'middlewares'>) {
  return function (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      ...options,
      middlewares: getTargetMiddlewares(target, propertyKey),
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function Mutation(
  options: Omit<ResolverOptions<any>, 'resolve' | 'mutation' | 'middlewares'>
) {
  return function (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      ...options,
      mutation: true,
      middlewares: getTargetMiddlewares(target, propertyKey),
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function getServiceResolvers(target: any): {[key: string]: Resolver<GlobalResolverResolve>} {
  if (!target.prototype) {
    throw new UserError('You must pass a class to getResolvers')
  }

  return target.prototype.resolvers || {}
}
