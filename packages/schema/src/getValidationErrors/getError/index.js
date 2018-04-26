import isNil from 'lodash/isNil'
import getFieldValidator from './getFieldValidator'
import validators from './validators'
import Errors from '../../Errors'

export default async function({schema, doc, value, currentSchema, keys}) {
  const info = {schema, doc, keys, currentSchema}

  if (isNil(value)) {
    if (currentSchema.optional) {
      return null
    } else {
      return Errors.REQUIRED
    }
  }

  const validatorKey = await getFieldValidator(currentSchema.type)
  const validator = validatorKey === 'custom' ? currentSchema.type : validators[validatorKey]

  const error = await validator.validate(value, info)
  if (error) {
    return error
  }

  return null
}
