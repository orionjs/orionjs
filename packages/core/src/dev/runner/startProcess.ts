import {spawn} from 'node:child_process'
import {getArgs} from './getArgs'
import {RunnerOptions} from './index'
import chalk from 'chalk'

export function startProcess(options: RunnerOptions, command: any) {
  const {startCommand, args} = getArgs(options, command)

  console.log(chalk.bold(`=> Starting app with command: ${startCommand} ${args.join(' ')}...\n`))
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
