import {getInstance, Service} from '@orion-js/services'
import route from '../routes/route'
import {OrionRouteOptions, RouteResolve, RoutesMap} from '../types'

export function Routes(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export function Route(options: Omit<OrionRouteOptions, 'resolve'>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteResolve>
  ) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.routes = target.routes || {}
    target.routes[propertyKey] = route({
      ...options,
      resolve: async (req, res, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](req, res, viewer)
      }
    })
  }
}

export function getServiceRoutes(target: any): RoutesMap {
  if (!target.prototype) {
    throw new Error('You must pass a class to getServiceRoutes')
  }

  return target.prototype.routes || {}
}
