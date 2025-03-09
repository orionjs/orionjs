import colors from 'colors/safe'
import { getRunner, RunnerOptions } from './runner'
import watchAndCompile from './watchAndCompile'
import { copyCursorRule } from './copyCursorRule'

export default async function (options: RunnerOptions) {
  console.log(colors.bold('\nOrionjs App ' + colors.green(colors.bold('V3\n'))))

  if (!options.omitCursorRule) {
    await copyCursorRule()
  }

  if (!options.omitMcpServer) {
    // await copyMcpServer()
  }

  const runner = getRunner(options)

  watchAndCompile(runner)
}
