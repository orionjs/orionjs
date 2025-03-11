import {internalGetEnv} from '@orion-js/env'
import express from 'express'

global.appRef = null
global.serverRef = null

export interface StartOrionOptions {
  keepAliveTimeout?: number
}

export const startServer = (
  port: number = Number(internalGetEnv('http_port', 'PORT')),
  otherOptions: StartOrionOptions = {},
) => {
  const app = getApp()

  const server = app.listen(port)
  global.serverRef = server

  if (otherOptions.keepAliveTimeout) {
    server.keepAliveTimeout = otherOptions.keepAliveTimeout // Ensure all inactive connections are terminated by the ALB, by setting this a few seconds higher than the ALB idle timeout
    server.headersTimeout = otherOptions.keepAliveTimeout + 1000
  }

  return app
}

export const getApp = (): express.Express => {
  if (global.appRef) return global.appRef as express.Express

  const app = express()

  global.appRef = app

  return app
}

export const getServer = () => {
  return global.serverRef
}
