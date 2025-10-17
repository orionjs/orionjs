export function formatStack(stack: string): string {
  if (!stack) return ''

  const lines = stack.split('\n')
  const errorLine = lines[0]
  const stackLines = lines.slice(1)

  // ANSI codes
  const dim = '\x1b[2m'
  const reset = '\x1b[0m'
  const cyan = '\x1b[36m'
  const yellow = '\x1b[33m'
  const gray = '\x1b[90m'

  const formattedStackLines = stackLines.map(line => {
    if (!line.trim()) return ''

    // Match different stack trace formats
    // Format: at functionName (path/file.ts:line:col)
    const match1 = line.match(/^(\s+at\s+)(.+?)(\s+\()([^)]+)(\))/)
    if (match1) {
      const [, atSpace, funcName, openParen, filePath, closeParen] = match1
      const fileMatch = filePath.match(/^(.*):(\d+):(\d+)$/)
      if (fileMatch) {
        const [, file, lineNum, colNum] = fileMatch
        return `${gray}  ${atSpace}${reset}${dim}${funcName}${reset} ${gray}${openParen}${cyan}${file}${gray}:${yellow}${lineNum}:${colNum}${gray}${closeParen}${reset}`
      }
    }

    // Format: at path/file.ts:line:col
    const match2 = line.match(/^(\s+at\s+)([^(]+):(\d+):(\d+)/)
    if (match2) {
      const [, atSpace, file, lineNum, colNum] = match2
      return `${gray}  ${atSpace}${cyan}${file}${gray}:${yellow}${lineNum}:${colNum}${reset}`
    }

    // Default: just dim the whole line
    return `${gray}  ${line.trim()}${reset}`
  })

  return `\n${errorLine}\n${formattedStackLines.filter(Boolean).join('\n')}`
}
