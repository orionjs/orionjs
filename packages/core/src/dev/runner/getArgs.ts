import {devBuildPath} from '../devBuildPath'
import {RunnerOptions} from './index'

export function getArgs(options: RunnerOptions, command: any) {
  if (options.node) {
    const startCommand = 'node'
    const args = ['--enable-source-maps', ...command.args, devBuildPath]
    return {startCommand, args}
  }

  const startCommand = 'bun'
  const args = ['--watch', ...command.args, devBuildPath]
  return {startCommand, args}
}
