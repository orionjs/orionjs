import winston, {createLogger as winstonCreateLogger, config, format} from 'winston'
import {jsonConsoleTransport, textConsoleTransport} from './formats'
import {getFileName, setFileName} from './helpers/getFileName'

const transports: winston.transport[] = [
  process.env.ORION_DEV ? textConsoleTransport : jsonConsoleTransport
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

const createLogger = (logger: winston.Logger) => {
  return {
    debug: (message: string, metadata: any = {}) => {
      setFileName(metadata)
      return logger.debug(message, metadata)
    },
    info: (message: string, metadata: any = {}) => {
      setFileName(metadata)
      return logger.info(message, metadata)
    },
    warn: (message: string, metadata: any = {}) => {
      setFileName(metadata)
      return logger.warn(message, metadata)
    },
    error: (message: string, metadata: any = {}) => {
      setFileName(metadata)
      return logger.error(message, metadata)
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
      return createLogger(logger.child(metadata))
    }
  }
}

export const logger = createLogger(winstonLogger)

export const addModuleContext = (moduleName: string, metadata: any) => {}
