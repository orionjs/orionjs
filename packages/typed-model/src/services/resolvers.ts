import {getInstance, Service} from '@orion-js/services'
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

export function Query(options: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>) {
  return function (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      ...options,
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function Mutation(options: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>) {
  return function (target: any, propertyKey: string, descriptor: GlobalResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = resolver({
      ...options,
      mutation: true,
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

export interface ModelResolverPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: ModelResolverResolve
}

export function ModelResolver(options: Omit<ResolverOptions<any>, 'resolve'>) {
  return function (target: any, propertyKey: string, descriptor: ModelResolverPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.resolvers = target.resolvers || {}
    target.resolvers[propertyKey] = modelResolver({
      ...options,
      resolve: async (item, params, viewer) => {
        const instance: any = getInstance(target.service)
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

export function Resolvers(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export function Model(typedModel: any): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.typedModel = typedModel
    target.prototype.service = target

    // @ts-expect-error this is a trick to make it work in resolvers without having to call getModelForClass
    target.getModel = () => getModelForClass(target)
  }
}
