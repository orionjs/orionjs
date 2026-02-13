import home from './home'
import healthCheck from './healthCheck'
import {startServer, registerRoutes, RoutesMap} from '@orion-js/http'
import {logger} from '@orion-js/logger'
import {env} from '@orion-js/env'

export default function startHttp(routes: RoutesMap) {
  registerRoutes({
    ...routes,
    home,
    healthCheck,
  })
  startServer(Number(env.http_port))
  logger.info(`Server started at port ${env.http_port} ✅`)
}
