import {isBun} from '../../helpers/isBun'

export function getArgs(_options: any, command: any) {
  if (isBun()) {
    const startCommand = 'bun'
    const args = ['--watch', ...command.args, './app/index.ts']
    return {startCommand, args}
  }

  const startCommand = 'tsx'
  const args = ['watch', '--clear-screen=false', ...command.args, './app/index.ts']
  return {startCommand, args}
}
