import {getRunner, RunnerOptions} from './runner'
import watchAndCompile from './watchAndCompile'
import {copyCursorRule} from './copyCursorRule'
import {copyMCP} from './copyMCP'
import {setupKeyboardShortcuts} from './setupKeyboardShortcuts'
import chalk from 'chalk'

export default async function (options: RunnerOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Dev mode \n`))

  if (!options.omitCursorRule) {
    await copyCursorRule().catch(console.error)
  }

  if (!options.omitMcpServer) {
    await copyMCP().catch(console.error)
  }

  if (!options.omitMcpServer && !options.omitCursorRule) {
    console.log(chalk.bold('=> ✨ Orionjs AI is ready\n'))
  }

  const runner = getRunner(options, command)

  setupKeyboardShortcuts(runner)
  watchAndCompile(runner)
}
