import config from '../config'

process
  .on('unhandledRejection', (reason, promise) => {
    const {logger} = config()
    logger.error('Unhandled promise rejection', reason)
  })
  .on('uncaughtException', error => {
    const {logger} = config()
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.error('Module not found', error)
    } else {
      logger.error('Uncaught Exception: ', error)
      process.exit(1)
    }
  })
