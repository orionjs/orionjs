import ts from 'typescript'
import {getConfigPath} from './getConfigPath'
import {reportDiagnostic, reportWatchStatusChanged} from './reports'

export function getHost() {
  const configPath = getConfigPath()
  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram

  // Note that there is another overload for `createWatchCompilerHost` that takes
  // a set of root files.
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
