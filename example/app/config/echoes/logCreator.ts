import {logger} from '@orion-js/logger'

const LEVELS = {
  NOTHING: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 4,
  DEBUG: 5,
}

const getLogger = (level: number) => {
  switch (level) {
    case LEVELS.ERROR:
    case LEVELS.NOTHING:
      return logger.error
    case LEVELS.WARN:
      return logger.warn
    case LEVELS.INFO:
      return logger.info
    case LEVELS.DEBUG:
      return logger.debug
  }
}

export default () => {
  return ({namespace, level, log}) => {
    if (level >= 4 && process.env.ORION_DEV) return
    const logFunction = getLogger(level)

    const {message, ...others} = log
    logFunction(`[Kafka ${namespace}] ${message}`, others)
  }
}
