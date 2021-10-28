import getValidationErrors from './getValidationErrors'
import {Schema, SchemaNodeType} from './types/schema'

export default async function isValid<T extends SchemaNodeType>(
  schema: Schema,
  doc: T,
  passedOptions = {},
  ...args
) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  return !validationErrors
}
