import chalk from 'chalk'
import ts from 'typescript'
import {getOptions} from './getOptions'
import {reportDiagnostic} from './reports'

export function compile({output}): void {
  const options = getOptions({output})

  const program = ts.createProgram(['./app/index.ts'], options)

  const preEmitDiagnostics = ts.getPreEmitDiagnostics(program)

  if (preEmitDiagnostics.length > 0) {
    console.log(chalk.red('\n==> Error builing Orion app\n'))
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
