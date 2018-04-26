import isNil from 'lodash/isNil'
import getFieldValidator from './getFieldValidator'
import validators from './validators'
import Errors from '../../Errors'

export default async function({schema, doc, value, currentSchema, keys}) {
  const info = {schema, doc, keys, currentSchema}

  if (isNil(value)) {
    if (!currentSchema.optional) {
      return Errors.REQUIRED
    }
  }

  const validatorKey = await getFieldValidator(currentSchema.type)
  const validator = validators[validatorKey]

  const error = await validator(value, info)
  if (error) {
    return error
  }

  if (typeof currentSchema.custom === 'function') {
    const customError = await currentSchema.custom(value, info)
    if (customError) {
      return customError
    }
  }

  return null
}
