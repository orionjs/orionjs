import {Runner} from '../runner'
import cleanDirectory from './cleanDirectory'
import {getHost} from './getHost'
import {watchEnvFile} from './writeEnvFile'

export default async function watchAndCompile(runner: Runner) {
  await cleanDirectory()
  getHost(runner)
  watchEnvFile(runner)
}
