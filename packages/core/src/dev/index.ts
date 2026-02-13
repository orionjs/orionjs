import {getRunner, RunnerOptions} from './runner'
import watchAndCompile from './watchAndCompile'
import {copyMCP} from './copyMCP'
import chalk from 'chalk'

export default async function (options: RunnerOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Dev mode \n`))

  if (!options.omitMcpServer) {
    await copyMCP().catch(console.error)
    console.log(chalk.bold('=> ✨ Orionjs AI is ready\n'))
  }

  const runner = getRunner(options, command)

  watchAndCompile(runner)
}
