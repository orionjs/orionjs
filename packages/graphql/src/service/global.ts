import {getInstance, Service} from '@orion-js/services'
import {GlobalResolverResolve, ResolverOptions, resolver, Resolver} from '@orion-js/resolvers'
import {UserError} from '@orion-js/helpers'
import {getTargetMetadata} from './otherParams'
import {GraphQLResolveInfo} from 'graphql'

export function Resolvers(): ClassDecorator {
  return (target: any) => {
    Service()(target)
    target.prototype.service = target
  }
}

export interface GlobalResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: GlobalResolverResolve
}

export function Query(options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>) {
  return (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) => {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      resolverId: propertyKey,
      params: getTargetMetadata(target, propertyKey, 'params'),
      returns: getTargetMetadata(target, propertyKey, 'returns'),
      middlewares: getTargetMetadata(target, propertyKey, 'middlewares'),
      ...options,
      resolve: async (params, viewer, info: GraphQLResolveInfo) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer, info)
      },
    })
  }
}

export function Mutation(options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>) {
  return (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) => {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      resolverId: propertyKey,
      params: getTargetMetadata(target, propertyKey, 'params'),
      returns: getTargetMetadata(target, propertyKey, 'returns'),
      middlewares: getTargetMetadata(target, propertyKey, 'middlewares'),
      ...options,
      mutation: true,
      resolve: async (params, viewer, info: GraphQLResolveInfo) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer, info)
      },
    })
  }
}

export function getServiceResolvers(target: any): {[key: string]: Resolver<GlobalResolverResolve>} {
  if (!target.prototype) {
    throw new UserError('You must pass a class to getResolvers')
  }

  return target.prototype.resolvers || {}
}
