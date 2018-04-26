import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'

export default async function(type) {
  if (isPlainObject(type)) {
    if (type._isFieldType) return 'custom'
    return 'plainObject'
  }
  if (isArray(type)) return 'array'
  if (type === String) return 'string'
  return 'unkown'
}
