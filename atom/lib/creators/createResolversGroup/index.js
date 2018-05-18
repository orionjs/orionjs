'use babel'
import makeCreator from '../makeCreator'
import addToIndex from './addToIndex'
import getContent from './getContent'

export default makeCreator(function({path, name, createFile, openFile}) {
  const content = getContent({path, name})
  createFile(`${name}/index.js`, content)
  addToIndex({path, name})
})
