import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import isString from 'lodash/isString'
import fieldTypes from '../../fieldTypes'
import has from 'lodash/has'

export default async function(type) {
  if (isPlainObject(type)) {
    if (type._isFieldType) return 'custom'
    return 'plainObject'
  }
  if (isArray(type)) return 'array'
  if (type === String) return 'string'
  if (type === Date) return 'date'
  if (type === Number) return 'number'
  if (type === Boolean) return 'boolean'

  if (!isString(type)) {
    throw new Error('Field type is invalid. Pass a string or a custom field type')
  }

  const exists = has(fieldTypes, type)

  if (!exists) {
    throw new Error('Field type does not exist')
  }

  return type
}
