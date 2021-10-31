import {values} from 'lodash'
import registerRoute from './registerRoute'
import {Route} from '../types'

interface OrionRoutesMap {
  [key: string]: Route
}

export default function registerRoutes(routesMap: OrionRoutesMap): void {
  const routes = values(routesMap)

  for (const route of routes) {
    registerRoute(route)
  }
}
