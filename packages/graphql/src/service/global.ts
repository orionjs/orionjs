import {getInstance, Service} from '@orion-js/services'
import {
  ResolverOptions,
  createResolver,
  GlobalResolver,
  GlobalResolverOptions,
} from '@orion-js/resolvers'
import {getTargetMetadata} from './middlewares'
import {SchemaFieldType} from '@orion-js/schema'

export {createResolver}

export const createQuery = createResolver
export const createMutation = <
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
  TInfo = any,
>(
  options: Omit<GlobalResolverOptions<TParams, TReturns, TViewer, TInfo>, 'mutation'>,
) => {
  return createResolver({
    ...options,
    mutation: true,
  })
}

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
export const internalResolversMetadata = new WeakMap<any, Record<string, any>>()

export function Resolvers() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'resolvers'})
  }
}

export function Query(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function Query(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Query(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const resolvers = internalResolversMetadata.get(this) || {}

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

      internalResolversMetadata.set(this, resolvers)
    })

    return method
  }
}

export function Mutation(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function Mutation(
  options?: Omit<ResolverOptions<any>, 'resolve' | 'mutation'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Mutation(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const resolvers = internalResolversMetadata.get(this) || {}

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
      internalResolversMetadata.set(this, resolvers)
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

  const resolversMap = internalResolversMetadata.get(instance) || {}

  return resolversMap
}
