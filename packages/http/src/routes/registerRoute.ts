import {getViewer} from './../viewer'
import {getApp} from './../start'
import {OrionRoute} from './RouteDef'
import {onError} from '../errors'

export default function registerRoute(route: OrionRoute): void {
  const app = getApp()
  const method = route.method
  const expressMethod = app[method]

  expressMethod(route.path, async (req, res) => {
    try {
      const viewer = await getViewer(req)
      await route.resolve(req, res, viewer)
    } catch (error) {
      await onError(req, res, error)
    }
  })
}
