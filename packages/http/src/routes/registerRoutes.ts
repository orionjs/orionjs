import {RoutesMap} from '../types'
import registerRoute from './registerRoute'

export default function registerRoutes(routesMap: RoutesMap): void {
  for (const routeName in routesMap) {
    registerRoute(routesMap[routeName])
  }
}
