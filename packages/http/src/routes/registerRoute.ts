import {getApp} from './../start'
import {Route} from '../types'
import {executeRequest} from './executeRequest'
import express from 'express'
import * as bodyParser from 'body-parser'

export default function registerRoute(route: Route): void {
  const app = getApp()
  const method = route.method

  const handler = async (req, res) => {
    executeRequest(route, req, res)
  }

  const handlers: Array<express.RequestHandler> = [handler]

  if (route.bodyParser) {
    const parser = bodyParser[route.bodyParser](route.bodyParserOptions)
    handlers.unshift(parser)
  }

  if (route.middlewares) {
    handlers.unshift(...route.middlewares)
  }

  app[method](route.path, ...handlers)
}
