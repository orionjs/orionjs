import isPlainObject from 'lodash/isPlainObject'
import isNil from 'lodash/isNil'

const dotGet = function dotGet(object, path) {
  if (path === '') return object

  const pathParts = path.split('.')
  let first = pathParts.shift()
  const remainingPath = pathParts.join('.')

  const levelObject = object.type

  if (first === '$' || /^[0-9]+$/.test(first)) {
    return dotGet({type: levelObject[0]}, remainingPath)
  } else if (isPlainObject(levelObject[first])) {
    return dotGet(levelObject[first], remainingPath)
  }

  if (levelObject === 'blackbox') {
    return {type: 'blackbox', optional: true}
  }

  return null
}

export default function(schema, path) {
  if (isNil(schema)) {
    throw new Error('You need to pass a schema')
  }
  return dotGet({type: schema}, path)
}
