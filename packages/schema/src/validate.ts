import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'
import {Schema, SchemaNodeType} from './types/schema'

export default async function validate<T extends SchemaNodeType>(
  schema: Schema,
  doc: T,
  passedOptions = {},
  ...args
) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
