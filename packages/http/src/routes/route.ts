import {RouteType, OrionRouteOptions} from '../types'

export default function route(options: OrionRouteOptions): RouteType {
  return {
    ...options
  }
}
