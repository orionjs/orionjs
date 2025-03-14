import {spawn} from 'node:child_process'
import {getArgs} from './getArgs'
import {RunnerOptions} from './index'

export function startProcess(options: RunnerOptions) {
  const {startCommand, args} = getArgs(options)

  return spawn(startCommand, args, {
    env: {
      ORION_DEV: 'local',
      ...process.env,
    },
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: false,
  })
}
