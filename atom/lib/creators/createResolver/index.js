'use babel'
import makeCreator from '../makeCreator'
import addToIndex from './addToIndex'
import getContent from './getContent'

export default makeCreator(function({path, name, createFile, openFile}) {
  const isRoot = path.includes('app/resolvers/')
  const content = getContent({path, name, isRoot})
  createFile(`${name}.js`, content)
  addToIndex({path, name})
  openFile(`${name}.js`)
})
