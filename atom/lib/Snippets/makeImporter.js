'use babel'
import addImport from '../helpers/addImport'

export default function({snippet, displayText, type = 'snippet', imports, ...otherOptions}) {
  return {
    snippet: snippet,
    displayText: displayText || snippet,
    type,
    ...otherOptions,
    onDidInsertSuggestion: function({fileContent, editor}) {
      if (fileContent.includes(imports)) return

      const bufferPosition = editor.getCursorBufferPosition()

      const newPosition = {
        row: bufferPosition.row + 1,
        column: bufferPosition.column
      }

      const newContent = addImport(fileContent, imports)
      editor.setText(newContent)
      editor.setCursorBufferPosition(newPosition)
    }
  }
}
