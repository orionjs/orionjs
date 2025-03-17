import {setOnError, onError} from './errors'
import {getViewer, setGetViewer} from './viewer'
import {startServer, getApp, getServer} from './start'
import express from 'express'
import registerRoute from './routes/registerRoute'
import registerRoutes from './routes/registerRoutes'
import bodyParserLib from 'body-parser'
import {RequestHandler} from 'express'

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

export * from './types'
export * from './service'
