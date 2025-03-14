import ts from 'typescript'

const format = {
  getCanonicalFileName: fileName => fileName,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => ts.sys.newLine,
}
export function reportDiagnostic(diagnostic: ts.Diagnostic) {
  console.log(ts.formatDiagnosticsWithColorAndContext([diagnostic], format))
}
