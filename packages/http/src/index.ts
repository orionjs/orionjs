import {setOnError, onError} from './errors'
import {getViewer, setGetViewer} from './viewer'
import {startServer, getApp} from './start'
import express from 'express'
import route from './routes/route'
import registerRoute from './routes/registerRoute'
import registerRoutes from './routes/registerRoutes'
import {json, raw, text, urlencoded} from 'body-parser'

const bodyParser = {json, raw, text, urlencoded}

export {
  express,
  startServer,
  getApp,
  getViewer,
  setGetViewer,
  setOnError,
  onError,
  route,
  registerRoute,
  registerRoutes,
  bodyParser
}

export * from './types'
export * from './service'
