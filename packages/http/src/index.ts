import bodyParserLib from 'body-parser'
import express, {RequestHandler} from 'express'
import {onError, setOnError} from './errors'
import registerRoute from './routes/registerRoute'
import registerRoutes from './routes/registerRoutes'
import {getApp, getServer, startServer} from './start'
import {getViewer, setGetViewer} from './viewer'

export * from './routes/route'

const {json, raw, text, urlencoded} = bodyParserLib

const bodyParser: {
  json: () => RequestHandler
  raw: () => RequestHandler
  text: () => RequestHandler
  urlencoded: (options?: {extended: boolean}) => RequestHandler
} = {json, raw, text, urlencoded}

export {
  express,
  startServer,
  getApp,
  getServer,
  getViewer,
  setGetViewer,
  setOnError,
  onError,
  registerRoute,
  registerRoutes,
  bodyParser,
}

export {registerReplEndpoint} from './repl'
export * from './service'
export * from './types'
