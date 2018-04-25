import isNil from 'lodash/isNil'
import getFieldValidator from './getFieldValidator'

export default async function({schema, doc, value, currentSchema, keys}) {
  const info = {schema, doc, keys, currentSchema}

  if (isNil(value)) {
    if (!currentSchema.optional) {
      return 'required'
    }
  }

  if (typeof currentSchema.custom === 'function') {
    const error = await currentSchema.custom(value, info)
    if (error) return error
  }

  const validator = await getFieldValidator(currentSchema.type)

  const error = validator(value, info)
  if (error) return error
}
