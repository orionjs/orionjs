import isPlainObject from 'lodash/isPlainObject'

const dotGet = function dotGet(object, path) {
  if (!object) return null
  if (path === '') return object

  const pathParts = path.split('.')
  let first = pathParts.shift()
  const remainingPath = pathParts.join('.')

  const levelObject = object.type

  if (first === '$' || /^[0-9]+$/.test(first)) {
    return dotGet({type: levelObject[0]}, remainingPath)
  } else if (isPlainObject(levelObject[first])) {
    return dotGet(levelObject[first], remainingPath)
  } else {
    return null
  }
}

export default function(object, path) {
  try {
    return dotGet({type: object}, path)
  } catch (e) {
    return null
  }
}
