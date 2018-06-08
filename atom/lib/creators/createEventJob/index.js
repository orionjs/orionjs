'use babel'
import makeCreator from '../makeCreator'
import getContent from './getContent'
import addToIndex from './addToIndex'

export default makeCreator(function({path, name, createFile, openFile}) {
  const content = getContent({path, name})
  createFile(`${name}/index.js`, content)
  addToIndex({path, name})
  openFile(`${name}/index.js`)
})
