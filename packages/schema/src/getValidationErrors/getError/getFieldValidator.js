import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import plainObject from './validators/plainObject'
import array from './validators/array'
import string from './validators/string'

export default async function(type) {
  if (isPlainObject(type)) return plainObject
  if (isArray(type)) return array
  return string
  return () => 'unknownFieldType'
}
