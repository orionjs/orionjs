import {getApp} from './../start'
import {Route} from '../types'
import {executeRequest} from './executeRequest'

export default function registerRoute(route: Route): void {
  const app = getApp()
  const method = route.method

  app[method](route.path, async (req, res): Promise<void> => {
    executeRequest(route, req, res)
  })
}
