import colors from 'colors/safe'
import {getRunner, RunnerOptions} from './runner'
import watchAndCompile from './watchAndCompile'

export default async function (options: RunnerOptions) {
  console.log(colors.bold('\nOrionjs App ' + colors.green(colors.bold('V3\n'))))

  const runner = getRunner(options)

  watchAndCompile(runner)
}
