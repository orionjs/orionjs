import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'
import {InferSchemaType} from './types/fields'
import {SchemaFieldType} from './types/schema'

export default async function validate<TSchema extends SchemaFieldType>(
  schema: TSchema,
  doc: InferSchemaType<TSchema>,
  passedOptions = {},
  ...args
) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
