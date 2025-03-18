import {spawn} from 'node:child_process'
import {getArgs} from './getArgs'
import {RunnerOptions} from './index'

export function startProcess(options: RunnerOptions, command: any) {
  const {startCommand, args} = getArgs(options, command)

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
