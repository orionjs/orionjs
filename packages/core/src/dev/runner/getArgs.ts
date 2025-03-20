import {RunnerOptions} from '.'

export function getArgs(_options: RunnerOptions, command: any) {
  const startCommand = 'tsx'

  const args = []

  args.push('watch', '--clear-screen=false')

  args.push(...command.args)

  args.push('./app/index.ts')

  return {startCommand, args}
}
