import chalk from 'chalk'
import {getRunner, RunnerOptions} from './runner'
import watchAndCompile from './watchAndCompile'

export default async function (options: RunnerOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Dev mode \n`))

  const runner = getRunner(options, command)

  watchAndCompile(runner)
}
