import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'
import {SchemaMetaFieldType, SchemaNodeType} from '../../types/schema'
import {FieldValidatorType} from '../../types/fieldValidators'
import {FieldType} from '../../fieldType'

export default function getFieldType<T extends SchemaNodeType>(
  type: SchemaMetaFieldType<T> | FieldValidatorType | any
) {
  const validatorKey = getFieldValidator(type)
  const validator = validatorKey === 'custom' ? type : fieldTypes[validatorKey]
  return validator as FieldType<T>
}
