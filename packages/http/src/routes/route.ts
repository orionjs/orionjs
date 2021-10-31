import {OrionRoute, OrionRouteOptions} from '../types'

export default function route(options: OrionRouteOptions): OrionRoute {
  return {
    ...options
  }
}
