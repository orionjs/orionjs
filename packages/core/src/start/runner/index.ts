import colors from 'colors/safe'
import writeFile from '../../helpers/writeFile'
import { startProcess } from './startProcess'

export interface RunnerOptions {
  shell: boolean
  clean: boolean
  // option to omit the creation of the orion cursor rule
  omitCursorRule?: boolean
  // omit the creation of the orion mcp server
  omitMcpServer?: boolean
}

export interface Runner {
  restart: () => void
  stop: () => void
  basePath: string
}

export function getRunner(options: RunnerOptions): Runner {
  let appProcess = null

  if (options.clean) {
    console.log(colors.bold('=> Cleaning directory...\n'))
  }

  const start = () => {
    console.log(colors.bold('=> Starting app...\n'))
    appProcess = startProcess(options)

    appProcess.on('exit', function (code: number, signal: string) {
      if (!code || code === 143 || code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
      } else {
        console.log(colors.bold(`=> Error running app. Exit code: ${code}`))
      }
    })

    writeFile('.orion/process', `${appProcess.pid}`)
  }

  const stop = () => {
    if (appProcess) {
      appProcess.kill()
    }
  }

  const restart = () => {
    stop()
    start()
  }

  return {
    restart,
    stop,
    basePath: `${process.cwd()}/.orion/build`
  }
}
