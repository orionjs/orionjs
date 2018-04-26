import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'

export default async function(type) {
  if (isPlainObject(type)) return 'plainObject'
  if (isArray(type)) return 'array'
  if (type === String) return 'string'
  return 'unkown'
}
