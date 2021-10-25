import ts, {ListFormat} from 'typescript'
import colors from 'colors/safe'

const format = {
  getCanonicalFileName: fileName => fileName,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => ts.sys.newLine
}
export function reportDiagnostic(diagnostic: ts.Diagnostic) {
  console.log(ts.formatDiagnosticsWithColorAndContext([diagnostic], format))
}
