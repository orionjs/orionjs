import express from 'express'

export interface OrionRouteOptions {
  method: 'get' | 'post' | 'put' | 'delete'
  path: string
  resolve: (req: express.Request, res: express.Response, viewer: any) => Promise<any>
}

export interface OrionRoute extends OrionRouteOptions {}
