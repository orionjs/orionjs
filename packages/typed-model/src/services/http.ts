import {getInstance, Service} from '@orion-js/services'
import {route, OrionRouteOptions, Route as RouteType} from '@orion-js/http'

export function Routes(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export interface RoutesPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: OrionRouteOptions['resolve']
}

export function Route(options: Omit<OrionRouteOptions, 'resolve'>) {
  return function (target: any, propertyKey: string, descriptor: RoutesPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.routes = target.routes || {}
    target.routes[propertyKey] = route({
      ...options,
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function getServiceRoutes(target: any): {[key: string]: RouteType} {
  if (!target.prototype) {
    throw new Error('You must pass a class to getServiceRoutes')
  }

  return target.prototype.routes || {}
}
