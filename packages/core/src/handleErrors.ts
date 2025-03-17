import chalk from 'chalk'

interface ErrorWithCodeFrame extends Error {
  codeFrame?: string
}

process
  .on('unhandledRejection', (error: ErrorWithCodeFrame) => {
    if (error.codeFrame) {
      console.error(chalk.red(error.message))
      console.log(error.codeFrame)
    } else {
      console.error(chalk.red(error.message), chalk.red('Unhandled promise rejection'))
    }
  })
  .on('uncaughtException', (error: Error) => {
    console.error(chalk.red(error.message))
    process.exit(1)
  })
