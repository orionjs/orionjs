import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'
import {SchemaFieldType} from '../../types/schema'
import {FieldValidatorType} from '../../types/fieldValidators'
import {FieldType} from '../../fieldType'

export default function getFieldType(type: SchemaFieldType | FieldValidatorType | any) {
  const validatorKey = getFieldValidator(type)
  const validator = validatorKey === 'custom' ? type : fieldTypes[validatorKey]
  return validator as FieldType
}
