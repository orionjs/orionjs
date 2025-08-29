import fieldTypes from '../../fieldTypes'
import {FieldValidatorType} from '../../types/fieldValidators'
import {SchemaFieldType} from '../../types'
import {isType} from 'rambdax'

export default function getFieldValidator(type: SchemaFieldType): FieldValidatorType {
  if (isType('Object', type)) {
    if ((type as any).__isFieldType) return 'custom'
    return 'plainObject'
  }
  if (Array.isArray(type)) return 'array'

  if (type === String) return 'string'
  if (typeof type === 'function' && type.name === 'Date') return 'date'
  if (type === Number) return 'number'
  if (type === Boolean) return 'boolean'
  if (type === 'enum') return 'string'
  if (typeof type === 'string' && type.startsWith('typedId:')) return 'string'

  if (typeof type !== 'string') {
    throw new Error(`Field type is invalid. Pass a string or a custom field type. Got ${type}`)
  }

  const exists = fieldTypes[type]

  if (!exists) {
    throw new Error(`Field type does not exist. Got ${type}`)
  }

  return type as FieldValidatorType
}
