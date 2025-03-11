import { setOnError, onError } from './errors'
import { getViewer, setGetViewer } from './viewer'
import { startServer, getApp, getServer } from './start'
import express from 'express'
import route from './routes/route'
import registerRoute from './routes/registerRoute'
import registerRoutes from './routes/registerRoutes'
import { json, raw, text, urlencoded } from 'body-parser'
import { RequestHandler } from 'express'

const bodyParser: {
  json: () => RequestHandler,
  raw: () => RequestHandler,
  text: () => RequestHandler,
  urlencoded: (options?: { extended: boolean }) => RequestHandler
} = { json, raw, text, urlencoded }

export {
  express,
  startServer,
  getApp,
  getServer,
  getViewer,
  setGetViewer,
  setOnError,
  onError,
  route,
  registerRoute,
  registerRoutes,
  bodyParser
}

export { Request, Response } from 'express'

export * from './types'
export * from './service'
