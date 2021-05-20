import micro from 'micro'
import handler from './handler'
import config from '../config'

let server = null

export default function () {
  if (server) return server
  if (process.env.ORION_TEST) return // no running in tests, port is used always
  server = micro(handler)
  const port = process.env.PORT || 3000
  server.listen(port)
  const {logger} = config()
  logger.info(`HTTP server started at port ${port}`)
  server.closeServer = () =>
    new Promise((resolve, reject) =>
      server.close(error => {
        if (error) return reject(error)
        logger.info(`HTTP server closed`)
        resolve()
      })
    )
  global.orionServer = server
  return server
}
