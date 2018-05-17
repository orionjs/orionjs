'use babel'
import addImport from '../helpers/addImport'

export default function({snippet, description, imports}) {
  return {
    snippet: snippet,
    displayText: snippet,
    type: 'snippet',
    description: description,
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
