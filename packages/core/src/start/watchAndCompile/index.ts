import ts from 'typescript'
import {Runner} from '../runner'
import {getConfigPath} from './getConfigPath'
import {getHost} from './getHost'
import colors from 'colors/safe'
import cleanDirectory from './cleanDirectory'
import writeIndex from './writeIndex'

export default async function watchAndCompile(runner: Runner) {
  await cleanDirectory()

  const host = getHost()

  const origCreateProgram = host.createProgram
  host.createProgram = (rootNames: ReadonlyArray<string>, options, host, oldProgram) => {
    return origCreateProgram(rootNames, options, host, oldProgram)
  }
  const origPostProgramCreate = host.afterProgramCreate

  host.afterProgramCreate = program => {
    origPostProgramCreate!(program)
    writeIndex()
    runner.restart()
  }

  // `createWatchProgram` creates an initial program, watches files, and updates
  // the program over time.
  ts.createWatchProgram(host)
}
