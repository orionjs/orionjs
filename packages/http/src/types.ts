import express from 'express'

export interface RouteResponse {
  statusCode?: number
  headers?: {[key: string]: string}
  body?: object
}

export interface OrionRouteOptions {
  method: 'get' | 'post' | 'put' | 'delete'
  path: string
  resolve: (
    req: express.Request,
    res: express.Response,
    viewer: any
  ) => Promise<RouteResponse> | Promise<void>
}

export interface Route extends OrionRouteOptions {}
