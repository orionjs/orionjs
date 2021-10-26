import express from 'express'

interface AppRef {
  app?: express.Express
}

const appRef: AppRef = {}

export const startServer = () => {
  const app = getApp()

  const port = process.env.PORT || 3000
  app.listen(port)

  return app
}

export const getApp = (): express.Express => {
  if (appRef.app) return appRef.app

  const app = express()
  appRef.app = app

  return app
}
