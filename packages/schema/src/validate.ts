import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'
import {StrictInferSchemaType} from './types/fields'
import {Schema} from './types/schema'

export default async function validate<TSchema extends Schema = any>(
  schema: TSchema,
  doc: StrictInferSchemaType<TSchema>,
  passedOptions = {},
  ...args
) {
  console.log('getting validation errors', {schema, doc, passedOptions, args})
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
