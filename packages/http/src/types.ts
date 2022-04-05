import express from 'express'
import * as bodyParser from 'body-parser'

export interface RouteResponse {
  statusCode?: number
  headers?: {[key: string]: string}
  body: string | object
}

export interface OrionRouteOptions {
  /**
   * The http method of the requests to match.
   */
  method: 'get' | 'post' | 'put' | 'delete' | 'all'
  /**
   * The path of the requests to match.
   */
  path: string
  /**
   * Select the body parser to use for this route.
   */
  bodyParser?: 'json' | 'text' | 'urlencoded'
  /**
   * Selected body parser options.
   */
  bodyParserOptions?: bodyParser.OptionsJson | bodyParser.OptionsText | bodyParser.OptionsUrlencoded
  /**
   * Add a middleware to the route.
   * See https://expressjs.com/en/4x/api.html#middleware
   * for more information.
   */
  middlewares?: Array<express.RequestHandler>
  resolve: (
    req: express.Request,
    res: express.Response,
    viewer: any
  ) => Promise<RouteResponse> | Promise<void>

  /**
   * Pass another express app
   */
  app?: express.Application
}

export interface Route extends OrionRouteOptions {}
