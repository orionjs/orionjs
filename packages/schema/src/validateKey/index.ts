import dotGetSchema from './dotGetSchema'
import getValidationErrors from '../getValidationErrors'
import Errors from '../Errors'
import {CurrentNodeInfoOptions, Schema} from '..'

const defaultOptions = {
  filter: false
}

export default async function (
  schema: Schema,
  key: string,
  value: any,
  passedOptions: CurrentNodeInfoOptions = {},
  ...args
) {
  const options: CurrentNodeInfoOptions = {...defaultOptions, ...passedOptions}
  const keySchema = dotGetSchema(schema, key)

  if (!keySchema) {
    if (options.filter) {
      return Errors.NOT_IN_SCHEMA
    } else {
      return null
    }
  }

  if (keySchema.isBlackboxChild) {
    return null
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
