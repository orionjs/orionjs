import ts from 'typescript'
import {Runner} from '../runner'
import {getHost} from './getHost'
import cleanDirectory from './cleanDirectory'
import writeIndex from './writeIndex'

export default async function watchAndCompile(runner: Runner) {
  await cleanDirectory()

  const host = getHost(runner)
  ts.createWatchProgram(host)
}
