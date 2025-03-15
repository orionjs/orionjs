import {getInstance, Service} from '@orion-js/services'
import {ResolverOptions, createResolver, GlobalResolver} from '@orion-js/resolvers'
import {getTargetMetadata} from './middlewares'

export {createResolver}

export const createQuery = createResolver
export const createMutation = createResolver

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const resolversMetadata = new WeakMap<any, Record<string, any>>()

export function Resolvers() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'resolvers'})
  }
}

export function Query(): (method: any, context: ClassFieldDecoratorContext) => any
export function Query(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Query(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const resolvers = resolversMetadata.get(this) || {}

      if (context.kind === 'method') {
        resolvers[propertyKey] = createResolver({
          resolverId: propertyKey,
          params: getTargetMetadata(method, propertyKey, 'params') || {},
          returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
          middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
          ...options,
          resolve: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        resolvers[propertyKey] = this[propertyKey]
      }

      resolversMetadata.set(this, resolvers)
    })

    return method
  }
}

export function Mutation(): (method: any, context: ClassFieldDecoratorContext) => any
export function Mutation(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Mutation(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const resolvers = resolversMetadata.get(this) || {}

      if (context.kind === 'method') {
        resolvers[propertyKey] = createResolver({
          resolverId: propertyKey,
          params: getTargetMetadata(method, propertyKey, 'params') || {},
          returns: getTargetMetadata(method, propertyKey, 'returns') || 'string',
          middlewares: getTargetMetadata(method, propertyKey, 'middlewares') || [],
          ...options,
          mutation: true,
          resolve: this[propertyKey].bind(this),
        })
      }
      if (context.kind === 'field') {
        this[propertyKey].mutation = true
        resolvers[propertyKey] = this[propertyKey]
      }
      resolversMetadata.set(this, resolvers)
    })

    return method
  }
}

export function getServiceResolvers(target: any): {
  [key: string]: GlobalResolver<any, any, any, any>
} {
  const instance = getInstance(target)

  const className = instance.constructor.name
  const errorMessage = `You must pass a class decorated with @Resolvers to getServiceResolvers. Check the class ${className}`

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error(errorMessage)
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'resolvers') {
    throw new Error(`${errorMessage}. Got class type ${instanceMetadata._serviceType}`)
  }

  const resolversMap = resolversMetadata.get(instance) || {}

  return resolversMap
}
