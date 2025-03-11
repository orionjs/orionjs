import {getInstance, Service} from '@orion-js/services'
import route from '../routes/route'
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

export function Route<
  This,
  TArgs extends Parameters<OrionRouteOptions['resolve']>,
  TReturn extends ReturnType<OrionRouteOptions['resolve']>,
>(options: Omit<OrionRouteOptions, 'resolve'>) {
  return (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>,
  ) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: This) {
      const routes = routeMetadata.get(this) || {}

      routes[propertyKey] = route({
        ...options,
        resolve: this[propertyKey].bind(this),
      })

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
