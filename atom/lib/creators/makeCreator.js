'use babel'
/* global atom */

import fs from 'fs-plus'

export default function(create) {
  return event => {
    const path = event.currentTarget
      .querySelector('.selected [data-path]')
      .getAttribute('data-path')
    const QuestionDialog = require('../dialogs/question')
    const dialog = new QuestionDialog(path, 'Enter the name')
    dialog.on('answer', (event, name) => {
      const createFile = (filePath, content) => {
        const finalPath = path + '/' + filePath
        if (fs.existsSync(finalPath)) {
          return atom.confirm({
            message: `File ${filePath} already exists`
          })
        }
        fs.writeFileSync(finalPath, content)
        return finalPath
      }

      const openFile = filePath => {
        const finalPath = path + '/' + filePath
        atom.workspace.open(finalPath)
      }

      create({path, name, createFile, openFile})
    })
    dialog.attach()
  }
}
