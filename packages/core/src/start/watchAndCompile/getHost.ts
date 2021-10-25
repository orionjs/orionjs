import ts from 'typescript'
import {getConfigPath} from './getConfigPath'
import {reportDiagnostic} from './reports'
import colors from 'colors/safe'
import writeIndex from './writeIndex'
import {Runner} from '../runner'

export function getHost(runner: Runner) {
  const reportWatchStatusChanged = (diagnostic: ts.Diagnostic) => {
    if (diagnostic.category !== 3) return

    if (diagnostic.code === 6032 || diagnostic.code === 6031) {
      runner.stop()
    }

    console.log(colors.bold(`=> [${diagnostic.code}] ${diagnostic.messageText}`))

    if (diagnostic.code === 6194) {
      /**
       * Sometimes diagnostic code is 6194 even with errors
       */
      if (/^Found .+ errors?/.test(diagnostic.messageText.toString())) {
        if (!diagnostic.messageText.toString().includes('Found 0 errors.')) {
          return
        }
      }

      writeIndex()
      runner.restart()
    }
  }

  const configPath = getConfigPath()
  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    createProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  )

  return host
}
