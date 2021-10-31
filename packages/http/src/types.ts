import express from 'express'
import * as bodyParser from 'body-parser'

export interface RouteResponse {
  statusCode?: number
  headers?: {[key: string]: string}
  body?: object
}

export interface OrionRouteOptions {
  method: 'get' | 'post' | 'put' | 'delete'
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
}

export interface Route extends OrionRouteOptions {}
