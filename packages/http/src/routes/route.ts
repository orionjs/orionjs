import {OrionRoute, OrionRouteOptions} from './RouteDef'

export default function route(options: OrionRouteOptions): OrionRoute {
  return {
    ...options
  }
}
