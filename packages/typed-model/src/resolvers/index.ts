import {getInstance} from '@orion-js/services'
import {
  GlobalResolverResolve,
  ResolverOptions,
  resolver,
  ModelResolverResolve,
  modelResolver,
  Resolver,
  ModelResolver
} from '@orion-js/resolvers'
import {UserError} from '@orion-js/helpers'

export interface GlobalResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: GlobalResolverResolve
}

export function CreateResolver(
  options: Omit<ResolverOptions<any>, 'resolve'> & {thisService: any}
) {
  return function (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      ...options,
      resolve: async (params, viewer) => {
        const instance: any = getInstance(options.thisService)
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

export interface ModelResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: ModelResolverResolve
}

export function CreateModelResolver(
  options: Omit<ResolverOptions<any>, 'resolve'> & {thisService: any}
) {
  return function (target: any, propertyKey: string, descriptor: ModelResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = modelResolver({
      ...options,
      resolve: async (item, params, viewer) => {
        const instance: any = getInstance(options.thisService)
        return await instance[propertyKey](item, params, viewer)
      }
    })
  }
}

export function getServiceModelResolvers(target: any): {
  [key: string]: ModelResolver<GlobalResolverResolve>
} {
  if (!target.prototype) {
    throw new UserError('You must pass a class to getResolvers')
  }

  return target.prototype.resolvers || {}
}
