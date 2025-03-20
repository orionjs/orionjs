import chalk from 'chalk'
import writeFile from '../../helpers/writeFile'
import {startProcess} from './startProcess'

export interface RunnerOptions {
  shell: boolean
  clean: boolean
  // option to omit the creation of the orion cursor rule
  omitCursorRule?: boolean
  // omit the creation of the orion mcp server
  omitMcpServer?: boolean
}

export interface Runner {
  start: () => void
  restart: () => void
  stop: () => void
}

export function getRunner(options: RunnerOptions, command: any): Runner {
  let appProcess = null

  if (options.clean) {
    console.log(chalk.bold('=> Cleaning directory...\n'))
  }

  const startApp = () => {
    appProcess = startProcess(options, command)

    appProcess.on('exit', (code: number, signal: string) => {
      if (!code || code === 143 || code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
      } else {
        console.log(chalk.bold(`=> Error running app. Exit code: ${code}`))
      }
    })

    writeFile('.orion/process', `${appProcess.pid}`)
  }

  const stop = () => {
    if (appProcess) {
      appProcess.kill()
      appProcess = null
    }
  }

  const restart = () => {
    console.log(chalk.bold('=> Restarting app...\n'))
    stop()
    startApp()
  }

  const start = () => {
    // check if the app is already running
    if (appProcess) {
      // console.log(chalk.bold('=> App is already running. Restarting...\n'))
    } else {
      startApp()
    }
  }

  return {
    restart,
    stop,
    start,
  }
}
