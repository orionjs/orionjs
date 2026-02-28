import {getInstance, Service} from '@orion-js/services'
import {createRoute} from '../routes/route'
import {OrionRouteOptions, RoutesMap} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const routeMetadata = new WeakMap<any, Record<string, any>>()
const routeEntriesByClass = new Map<Function, Record<string, (instance: any) => any>>()
let pendingRouteEntries: Record<string, (instance: any) => any> = {}

export function Routes() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'routes'})

    if (Object.keys(pendingRouteEntries).length > 0) {
      routeEntriesByClass.set(target, pendingRouteEntries)
      pendingRouteEntries = {}
    }
  }
}

export function Route(): (method: any, context: ClassFieldDecoratorContext) => any
export function Route(
  options?: Omit<OrionRouteOptions<any, any, any, any>, 'resolve'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Route(options?: Omit<OrionRouteOptions<any, any, any, any>, 'resolve'>) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    if (context.kind === 'method') {
      pendingRouteEntries[propertyKey] = (instance: any) =>
        createRoute({
          ...options,
          resolve: instance[propertyKey].bind(instance),
        })
    }

    if (context.kind === 'field') {
      pendingRouteEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

    return method
  }
}

function initializeRoutesIfNeeded(instance: any) {
  if (routeMetadata.has(instance)) return
  const entries = routeEntriesByClass.get(instance.constructor) || {}
  const routes: Record<string, any> = {}
  for (const [key, setup] of Object.entries(entries)) {
    routes[key] = setup(instance)
  }
  routeMetadata.set(instance, routes)
}

export function getServiceRoutes(target: any): RoutesMap {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Routes to getServiceRoutes')
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'routes') {
    throw new Error('You must pass a class decorated with @Routes to getServiceRoutes')
  }

  initializeRoutesIfNeeded(instance)

  const routesMap = routeMetadata.get(instance) || {}

  return routesMap
}
