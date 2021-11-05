import ts from 'typescript'
import {Runner} from '../runner'
import {getHost} from './getHost'

export default async function watchAndCompile(runner: Runner) {
  const host = getHost(runner)
  ts.createWatchProgram(host)
}
