import colors from 'colors'

process
  .on('unhandledRejection', (reason, promise) => {
    console.error(colors.red(reason), 'Unhandled Rejection at Promise', promise)
  })
  .on('uncaughtException', error => {
    console.error(colors.red(error))
    process.exit(1)
  })
