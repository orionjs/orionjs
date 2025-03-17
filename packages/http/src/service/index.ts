import {getInstance, Service} from '@orion-js/services'
import {createRoute} from '../routes/route'
import {OrionRouteOptions, RoutesMap} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const routeMetadata = new WeakMap<any, Record<string, any>>()

export function Routes() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'routes'})
    })
  }
}

export function Route(): (method: any, context: ClassFieldDecoratorContext) => any
export function Route(
  options?: Omit<OrionRouteOptions<any, any, any, any>, 'resolve'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function Route(options?: Omit<OrionRouteOptions<any, any, any, any>, 'resolve'>) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const routes = routeMetadata.get(this) || {}

      if (context.kind === 'method') {
        routes[propertyKey] = createRoute({
          ...options,
          resolve: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        routes[propertyKey] = this[propertyKey]
      }

      routeMetadata.set(this, routes)
    })

    return method
  }
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

  const routesMap = routeMetadata.get(instance) || {}

  return routesMap
}
