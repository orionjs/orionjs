import dotGetSchema from './dotGetSchema'
import getValidationErrors from './getValidationErrors'
import Errors from './Errors'

const defaultOptions = {}

export default async function(schema, key, value, passedOptions = {}, ...args) {
  const options = {...defaultOptions, ...passedOptions}
  const keySchema = dotGetSchema(schema, key)

  if (!keySchema) {
    if (options.filter) {
      return Errors.NOT_IN_SCHEMA
    } else {
      return null
    }
  }

  const result = await getValidationErrors(
    {validate: keySchema},
    {validate: value},
    options,
    ...args
  )

  if (!result) return null

  return result.validate
}
