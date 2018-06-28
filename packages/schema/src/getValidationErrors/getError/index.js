import isNil from 'lodash/isNil'
import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'
import Errors from '../../Errors'

export default async function(params) {
  const {schema, doc, currentDoc, value, currentSchema, keys, options = {}, args = []} = params
  const info = {schema, doc, currentDoc, keys, currentSchema, options}

  if (isNil(value)) {
    if (!currentSchema.optional && !options.omitRequired) {
      return Errors.REQUIRED
    }
  } else {
    const validatorKey = getFieldValidator(currentSchema.type)
    const validator = validatorKey === 'custom' ? currentSchema.type : fieldTypes[validatorKey]

    const error = await validator.validate(value, info, ...args)
    if (error) {
      return error
    }
  }

  if (currentSchema.custom) {
    const customError = await currentSchema.custom(value, info, ...args)
    if (customError) {
      return customError
    }
  }

  if (currentSchema.type.__validate) {
    const typeError = await currentSchema.type.__validate(value, info, ...args)
    if (typeError) {
      return typeError
    }
  }

  return null
}
