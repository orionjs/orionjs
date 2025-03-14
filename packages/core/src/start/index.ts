import chalk from 'chalk'
import {copyCursorRule} from './copyCursorRule'
import {copyMCP} from './copyMCP'
import {RunnerOptions, getRunner} from './runner'
import watchAndCompile from './watchAndCompile'

export default async function (options: RunnerOptions) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4\n'))}`))

  if (!options.omitCursorRule) {
    await copyCursorRule().catch(console.error)
  }

  if (!options.omitMcpServer) {
    await copyMCP().catch(console.error)
  }

  if (!options.omitMcpServer && !options.omitCursorRule) {
    console.log(chalk.bold('=> ✨ Orionjs AI is ready\n'))
  }

  const runner = getRunner(options)

  watchAndCompile(runner)
}
