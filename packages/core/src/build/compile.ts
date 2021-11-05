import ts from 'typescript'
import {getConfigPath} from '../start/watchAndCompile/getConfigPath'
import {getOptions} from './getOptions'
import path from 'path'
import colors from 'colors/safe'
import {reportDiagnostic} from '../start/watchAndCompile/reports'

export function compile({output}): void {
  const {options, fileNames} = getOptions({output})

  const program = ts.createProgram(fileNames, options)

  const preEmitDiagnostics = ts.getPreEmitDiagnostics(program)

  if (preEmitDiagnostics.length > 0) {
    console.log(colors.red(`\n==> Error builing Orion app\n`))
  }

  preEmitDiagnostics.forEach(reportDiagnostic)

  if (preEmitDiagnostics.length > 0) {
    process.exit(1)
  }

  const emitResult = program.emit()

  emitResult.diagnostics.forEach(reportDiagnostic)

  if (emitResult.emitSkipped) {
    process.exit(1)
  }
}
