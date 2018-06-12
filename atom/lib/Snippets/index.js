'use babel'
import debounce from 'lodash/debounce'
import importCollections from './importCollections'
import importModels from './importModels'
import importNeighbourFile from './importNeighbourFile'
import escapeStringRegexp from 'escape-string-regexp'

const providers = [importCollections, importModels, importNeighbourFile]

export default class Snippets {
  selector = '.source.js'
  inclusionPriority = 1
  id = 1

  constructor() {
    this.addId = debounce(() => this.id++, 3000)
  }

  getLine(text, bufferPosition) {
    return text.split('\n')[bufferPosition.row]
  }

  getId() {
    this.addId()
    return this.id
  }

  onDidInsertSuggestion({editor, triggerPosition, suggestion}) {
    if (!suggestion.onDidInsertSuggestion) return
    const fileContent = editor.buffer.getText()
    const file = editor.buffer.file
    suggestion.onDidInsertSuggestion({editor, triggerPosition, suggestion, fileContent, file})
  }

  async getSuggestions({editor, bufferPosition, scopeDescriptor, prefix}) {
    const fileContent = editor.buffer.getText()
    const path = editor.buffer.file.path
    const lineText = this.getLine(fileContent, bufferPosition)
    const nextLine = this.getLine(fileContent, {...bufferPosition, row: bufferPosition.row + 1})
    const preText = lineText.substr(0, bufferPosition.column)
    const beforeText = preText.replace(new RegExp(`${escapeStringRegexp(prefix)}$`), '')
    const id = this.getId(editor, bufferPosition)
    const suggestions = []
    const file = editor.buffer.file

    for (const provider of providers) {
      try {
        const result =
          (await provider({
            id,
            path,
            file,
            lineText,
            preText,
            editor,
            bufferPosition,
            scopeDescriptor,
            prefix,
            fileContent,
            nextLine,
            beforeText
          })) || []
        result.forEach(suggestion => suggestions.push(suggestion))
      } catch (error) {
        console.log('Orionjs snippets error', error)
      }
    }

    return suggestions
  }
}
