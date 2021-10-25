import config from '../config'
import types from '../echo/types'

export default function (method: string) {
  const echo = config.echoes[method]

  if (!echo) {
    throw new Error(`Echo named ${method} not found in this service`)
  }

  if (echo.type !== types.request) {
    throw new Error(`Echo named ${method} is not of type request`)
  }

  return echo
}
