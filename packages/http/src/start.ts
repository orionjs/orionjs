import express from 'express'

global.appRef = null

export const startServer = (port: number = Number(process.env.PORT)) => {
  const app = getApp()

  app.listen(port)

  return app
}

export const getApp = (): express.Express => {
  if (global.appRef) return global.appRef as express.Express

  const app = express()

  global.appRef = app

  return app
}
