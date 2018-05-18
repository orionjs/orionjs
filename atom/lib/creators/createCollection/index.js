'use babel'
import makeCreator from '../makeCreator'
import getContent from './getContent'

export default makeCreator(function({path, name, createFile, openFile}) {
  const content = getContent({path, name})
  createFile(`${name}/index.js`, content)
  openFile(`${name}/index.js`)
})
