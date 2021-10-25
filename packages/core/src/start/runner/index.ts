import colors from 'colors/safe'
import writeFile from '../../helpers/writeFile'
import {startProcess} from './startProcess'

export interface RunnerOptions {
  shell: boolean
}

export interface Runner {
  restart: () => void
}

export function getRunner(options: RunnerOptions): Runner {
  let appProcess = null

  const restart = () => {
    if (appProcess) {
      appProcess.kill()
    }

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

  return {restart}
}
