import colors from 'colors'

process
  .on('unhandledRejection', (error: any) => {
    if (error.codeFrame) {
      console.error(colors.red(error.message))
      console.log(error.codeFrame)
    } else {
      console.error(colors.red(error.message), colors.red('Unhandled promise rejection'))
    }
  })
  .on('uncaughtException', error => {
    console.error(colors.red(error.message))
    process.exit(1)
  })
