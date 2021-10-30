import isNil from 'lodash/isNil'
import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'
import Errors from '../../Errors'
import {CurrentNodeInfo, SchemaRecursiveNodeTypeExtras} from '../../types/schema'
import {FieldType} from '../../fieldType'

export default async function getValidationErrors(
  params: CurrentNodeInfo
): Promise<object | string | void> {
  const {schema, doc, currentDoc, value, currentSchema, keys, options = {}, args = []} = params
  const info = {schema, doc, currentDoc, keys, currentSchema, options}

  if (isNil(value)) {
    if (!currentSchema.optional && !options.omitRequired) {
      return Errors.REQUIRED
    }
  } else {
    const validatorKey = getFieldValidator(currentSchema.type)
    const validator =
      validatorKey === 'custom' ? (currentSchema.type as FieldType) : fieldTypes[validatorKey]

    const error = await validator.validate(value, info, ...args)
    if (error) {
      return error
    }
  }

  // to not deprecate yet custom field
  if (currentSchema.custom) currentSchema.validate = currentSchema.custom

  if (currentSchema.validate) {
    const customError = await currentSchema.validate(value, info, ...args)
    if (customError) {
      return customError
    }
  }

  const type = currentSchema.type as SchemaRecursiveNodeTypeExtras

  if (type.__validate) {
    const typeError = await type.__validate(value, info, ...args)
    if (typeError) {
      return typeError
    }
  }

  return null
}
