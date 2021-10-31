import {Route, OrionRouteOptions} from '../types'

export default function route(options: OrionRouteOptions): Route {
  return {
    ...options
  }
}
