import {values} from 'lodash'
import registerRoute from './registerRoute'
import {OrionRoute} from './RouteDef'

interface OrionRoutesMap {
  [key: string]: OrionRoute
}

export default function registerRoutes(routesMap: OrionRoutesMap): void {
  const routes = values(routesMap)

  for (const route of routes) {
    registerRoute(route)
  }
}
