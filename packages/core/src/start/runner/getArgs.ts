import {RunnerOptions} from '.'

export function getArgs(options: RunnerOptions) {
  let startCommand = process.env.START_COMMAND || 'node'

  const args = []

  if (process.env.START_COMMAND) {
    const [first, ...otherArgs] = process.env.START_COMMAND.split(' ')
    startCommand = first
    args.push(...otherArgs)

    console.log('Using custom command: ' + [startCommand, ...args].join(' '))
  } else if (options.shell) {
    args.push('--inspect')
  }

  args.push('.orion/build/index.js')

  return {startCommand, args}
}
