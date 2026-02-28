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
const resolverEntriesByClass = new Map<Function, Record<string, (instance: any) => any>>()
let pendingResolverEntries: Record<string, (instance: any) => any> = {}

export function Resolvers() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'resolvers'})

    if (Object.keys(pendingResolverEntries).length > 0) {
      resolverEntriesByClass.set(target, pendingResolverEntries)
      pendingResolverEntries = {}
    }
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

    if (context.kind === 'method') {
      const params = getTargetMetadata(method, propertyKey, 'params') || {}
      const returns = getTargetMetadata(method, propertyKey, 'returns') || 'string'
      const middlewares = getTargetMetadata(method, propertyKey, 'middlewares') || []
      pendingResolverEntries[propertyKey] = (instance: any) =>
        createResolver({
          resolverId: propertyKey,
          params,
          returns,
          middlewares,
          ...options,
          resolve: instance[propertyKey].bind(instance),
        })
    }

    if (context.kind === 'field') {
      pendingResolverEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

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

    if (context.kind === 'method') {
      const params = getTargetMetadata(method, propertyKey, 'params') || {}
      const returns = getTargetMetadata(method, propertyKey, 'returns') || 'string'
      const middlewares = getTargetMetadata(method, propertyKey, 'middlewares') || []
      pendingResolverEntries[propertyKey] = (instance: any) =>
        createResolver({
          resolverId: propertyKey,
          params,
          returns,
          middlewares,
          ...options,
          mutation: true,
          resolve: instance[propertyKey].bind(instance),
        })
    }

    if (context.kind === 'field') {
      pendingResolverEntries[propertyKey] = (instance: any) => {
        instance[propertyKey].mutation = true
        return instance[propertyKey]
      }
    }

    return method
  }
}

export function registerPendingResolver(propertyKey: string, setup: (instance: any) => any) {
  pendingResolverEntries[propertyKey] = setup
}

function initializeResolversIfNeeded(instance: any) {
  if (internalResolversMetadata.has(instance)) return
  const entries = resolverEntriesByClass.get(instance.constructor) || {}
  const resolvers: Record<string, any> = {}
  for (const [key, setup] of Object.entries(entries)) {
    resolvers[key] = setup(instance)
  }
  internalResolversMetadata.set(instance, resolvers)
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

  initializeResolversIfNeeded(instance)

  const resolversMap = internalResolversMetadata.get(instance) || {}

  return resolversMap
}
