import colors from 'colors'

process
  .on('unhandledRejection', (error, promise) => {
    if (error.codeFrame) {
      console.error(colors.red(error.message))
      console.log(error.codeFrame)
    } else {
      console.error(colors.red(error), colors.red('Unhandled promise rejection'))
    }
  })
  .on('uncaughtException', error => {
    console.error(colors.red(error))
    process.exit(1)
  })
