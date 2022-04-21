import {values} from 'lodash'
import registerRoute from './registerRoute'
import {RoutesMap} from '../types'

export default function registerRoutes(routesMap: RoutesMap): void {
  const routes = values(routesMap)

  for (const route of routes) {
    registerRoute(route)
  }
}
