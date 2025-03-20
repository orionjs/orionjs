import ts from 'typescript'
import {Runner} from '../runner'
import cleanDirectory from './cleanDirectory'
import {getHost} from './getHost'
import {watchEnvFile} from './writeEnvFile'

export default async function watchAndCompile(runner: Runner) {
  await cleanDirectory()
  const host = getHost(runner)
  ts.createWatchProgram(host)
  watchEnvFile(runner)
}
