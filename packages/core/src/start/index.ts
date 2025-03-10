import colors from 'colors/safe'
import { getRunner, RunnerOptions } from './runner'
import watchAndCompile from './watchAndCompile'
import { copyCursorRule } from './copyCursorRule'
import { copyMCP } from './copyMCP'

export default async function (options: RunnerOptions) {
  console.log(colors.bold('\nOrionjs App ' + colors.green(colors.bold('V3\n'))))


  if (!options.omitCursorRule) {
    await (copyCursorRule().catch(console.error))
  }

  if (!options.omitMcpServer) {
    await (copyMCP().catch(console.error))
  }

  if (!options.omitMcpServer && !options.omitCursorRule) {
    console.log(colors.bold(`=> ✨ Orionjs AI is ready\n`))
  }

  const runner = getRunner(options)

  watchAndCompile(runner)
}
