import {spawn} from 'child_process'
import {getArgs} from './getArgs'

export function startProcess(options) {
  const {startCommand, args} = getArgs(options)

  return spawn(startCommand, args, {
    env: {
      ORION_DEV: 'local',
      ...process.env
    },
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: false
  })
}
