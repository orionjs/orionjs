import {Schema, SchemaNode} from '..'
import {isType, isNil} from 'rambdax'

const dotGet = function dotGet(object: SchemaNode, path: string) {
  if (path === '') return object

  const pathParts = path.split('.')
  const first = pathParts.shift()
  const remainingPath = pathParts.join('.')

  const levelObject = object.type

  if (first === '$' || /^[0-9]+$/.test(first)) {
    return dotGet({type: levelObject[0]}, remainingPath)
  }

  if (isType('Object', levelObject[first])) {
    return dotGet(levelObject[first], remainingPath)
  }

  if (levelObject === 'blackbox') {
    return {type: 'blackbox', optional: true, isBlackboxChild: true}
  }

  return null
}

export default function (schema: Schema, path: string) {
  if (isNil(schema)) {
    throw new Error('You need to pass a schema')
  }
  return dotGet({type: schema}, path)
}
