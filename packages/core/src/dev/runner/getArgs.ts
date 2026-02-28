import {RunnerOptions} from './index'

export function getArgs(options: RunnerOptions, command: any) {
  if (options.node) {
    const startCommand = 'tsx'
    const args = ['watch', '--clear-screen=false', ...command.args, './app/index.ts']
    return {startCommand, args}
  }

  const startCommand = 'bun'
  const args = ['--watch', ...command.args, './app/index.ts']
  return {startCommand, args}
}
