import ts from 'typescript'

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
}

export function reportDiagnostic(diagnostic: ts.Diagnostic) {
  console.error(
    'Error',
    diagnostic.code,
    ':',
    ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine())
  )
}

/**
 * Prints a diagnostic every time the watch status changes.
 * This is mainly for messages like "Starting compilation" or "Compilation completed".
 */
export function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {}
