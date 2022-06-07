import winston, {createLogger as winstonCreateLogger, config, format} from 'winston'
import {jsonConsoleTransport, textConsoleTransport} from './formats'
import {getFileName} from './helpers/getFileName'
import {OrionLogger} from './types'

const transports: winston.transport[] = [
  process.env.ORION_DEV || process.env.JEST_WORKER_ID ? textConsoleTransport : jsonConsoleTransport
]

export const winstonLogger = winstonCreateLogger({
  levels: config.npm.levels,
  handleExceptions: true,
  format: format.errors({stack: true}),
  transports: transports
})

export const configureLogger = (options: winston.LoggerOptions) => {
  return winstonLogger.configure(options)
}

export const setLogLevel = (level: string) => {
  return (winstonLogger.level = level)
}

export const addTransport = (transport: winston.transport) => {
  return winstonLogger.add(transport)
}

export const getLogger = (context: string) => {
  return winstonLogger.child({context})
}

const createLogger = (logger: winston.Logger): OrionLogger => {
  return {
    debug: (message: string, value: any = {}) => {
      const fileName = getFileName()
      return logger.debug(message, {value, fileName})
    },
    info: (message: string, value: any = {}) => {
      const fileName = getFileName()
      return logger.info(message, {value, fileName})
    },
    warn: (message: string, value: any = {}) => {
      const fileName = getFileName()
      return logger.warn(message, {value, fileName})
    },
    error: (message: string, value: any = {}) => {
      const fileName = getFileName()
      return logger.error(message, {value, fileName})
    },
    addContext: (module: NodeJS.Module) => {
      if (module.id) {
        const split = String(module.id).split('.orion/build/')
        const fileName = split.length > 1 ? split[1] : split[0]
        return createLogger(logger.child({fileName}))
      }
      return createLogger(logger.child({}))
    },
    addMetadata: (metadata: any) => {
      return createLogger(logger.child({parent: metadata}))
    }
  }
}

export const logger = createLogger(winstonLogger)
