import config from '../config'

export default function (method: string) {
  const echo = config.echoes[method]

  if (!echo) {
    throw new Error(`Echo named ${method} not found in this service`)
  }

  if (echo.type !== 'request') {
    throw new Error(`Echo named ${method} is not of type request`)
  }

  return echo
}
