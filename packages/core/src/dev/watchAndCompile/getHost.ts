import ts from 'typescript'
import {getConfigPath} from './getConfigPath'
import {reportDiagnostic} from './reports'
import {Runner} from '../runner'
import chalk from 'chalk'

export function getHost(runner: Runner) {
  let isStopped = true
  const reportWatchStatusChanged = (diagnostic: ts.Diagnostic) => {
    if (diagnostic.category !== 3) return
    if (diagnostic.code === 6031 || diagnostic.code === 6032) {
      // file change detected, starting compilation
      // console.log(chalk.bold(`=> ${diagnostic.messageText}`))
      return
    }

    if (diagnostic.code === 6193) {
      runner.stop()
      isStopped = true
      return
    }

    if (diagnostic.code === 6194) {
      /**
       * Sometimes diagnostic code is 6194 even with errors
       */
      if (/^Found .+ errors?/.test(diagnostic.messageText.toString())) {
        if (!diagnostic.messageText.toString().includes('Found 0 errors.')) {
          runner.stop()
          isStopped = true
          return
        }
      }

      if (isStopped) {
        isStopped = false
        runner.start()
      }
      return
    }

    console.log(chalk.bold(`=> ${diagnostic.messageText} [${diagnostic.code}]`))
  }

  const configPath = getConfigPath()
  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    createProgram,
    reportDiagnostic,
    reportWatchStatusChanged,
  )

  return host
}
