import {Runner, RunnerOptions} from '../runner'
import cleanDirectory from './cleanDirectory'
import {watchAndBundle} from './watchAndBundle'
import {watchAndTypecheck} from './watchAndTypecheck'
import {watchEnvFile} from './writeEnvFile'

export default async function watchAndCompile(runner: Runner, options: RunnerOptions) {
  await cleanDirectory()
  const requestTypecheck = options.typecheck ? watchAndTypecheck(runner) : undefined
  await watchAndBundle(runner, options, requestTypecheck)
  requestTypecheck?.()
  watchEnvFile(runner)
}
