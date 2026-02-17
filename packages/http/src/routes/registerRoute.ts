import bodyParser from 'body-parser'
import express from 'express'
import {getApp} from './../start'
import {RouteType} from '../types'
import {executeRequest} from './executeRequest'

const appRegisteredRoutes = new WeakMap<express.Application, WeakSet<RouteType>>()

function getRegisteredRoutes(app: express.Application) {
  if (appRegisteredRoutes.has(app)) {
    return appRegisteredRoutes.get(app)
  }

  const routes = new WeakSet<RouteType>()
  appRegisteredRoutes.set(app, routes)
  return routes
}

export default function registerRoute(route: RouteType): void {
  const app = route.app || getApp()
  const registeredRoutes = getRegisteredRoutes(app)
  if (registeredRoutes.has(route)) return

  const method = route.method

  const handler: express.RequestHandler = (req, res) => {
    void executeRequest(route, req as any, res)
  }

  const handlers: Array<express.RequestHandler> = [handler]

  if (route.bodyParser) {
    const parser = bodyParser[route.bodyParser](route.bodyParserOptions)
    handlers.unshift(parser)
  }

  if (!route.bodyParser && route.bodyParams) {
    const parser = bodyParser.json(route.bodyParserOptions)
    handlers.unshift(parser)
  }

  if (route.middlewares) {
    handlers.unshift(...route.middlewares)
  }

  app[method](route.path, ...handlers)
  registeredRoutes.add(route)
}
