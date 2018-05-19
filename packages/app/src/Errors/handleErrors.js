import colors from 'colors'

process
  .on('unhandledRejection', (reason, promise) => {
    console.error(colors.red(reason), colors.red('Unhandled promise rejection'))
  })
  .on('uncaughtException', error => {
    console.error(colors.red(error))
    process.exit(1)
  })
