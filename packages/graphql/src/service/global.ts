import {getInstance, Service} from '@orion-js/services'
import {GlobalResolverResolve, ResolverOptions, resolver, Resolver} from '@orion-js/resolvers'
import {getTargetMetadata} from './middlewares'
import {InternalGlobalResolverResolveAtDecorator} from './types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const resolversMetadata = new WeakMap<any, Record<string, any>>()

export function Resolvers() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'resolvers'})
    })
  }
}

export function Query<This>(options: Omit<ResolverOptions<any>, 'resolve' | 'mutation'> = {}) {
  return (
    method: InternalGlobalResolverResolveAtDecorator<This, any, any, any, any>,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: This) {
      const resolvers = resolversMetadata.get(this) || {}

      resolvers[propertyKey] = resolver({
        resolverId: propertyKey,
        params: getTargetMetadata(method, propertyKey, 'params') || {},
        returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
        middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
        ...options,
        resolve: this[propertyKey].bind(this),
      })

      resolversMetadata.set(this, resolvers)
    })

    return method
  }
}

export function Mutation<This, TParams, TReturns, TViewer, TInfo>(
  options: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>,
) {
  return (
    method: InternalGlobalResolverResolveAtDecorator<This, TParams, TReturns, TViewer, TInfo>,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: This) {
      const resolvers = resolversMetadata.get(this) || {}

      resolvers[propertyKey] = resolver({
        resolverId: propertyKey,
        params: getTargetMetadata(method, propertyKey, 'params') || {},
        returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
        middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
        ...options,
        mutation: true,
        resolve: this[propertyKey].bind(this),
      })

      resolversMetadata.set(this, resolvers)
    })

    return method
  }
}

export function getServiceResolvers(target: any): {
  [key: string]: Resolver<GlobalResolverResolve>
} {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Resolvers to getServiceResolvers')
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'resolvers') {
    throw new Error('You must pass a class decorated with @Resolvers to getServiceResolvers')
  }

  const resolversMap = resolversMetadata.get(instance) || {}

  return resolversMap
}
