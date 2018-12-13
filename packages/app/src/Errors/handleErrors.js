import colors from 'colors/safe'

process
  .on('unhandledRejection', (reason, promise) => {
    console.error(colors.red(reason), colors.red('Unhandled promise rejection'))
  })
  .on('uncaughtException', error => {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error(colors.red(error.message))
    } else {
      console.error(colors.red(error))
      process.exit(1)
    }
  })
