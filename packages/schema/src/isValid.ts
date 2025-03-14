import getValidationErrors from './getValidationErrors'
import {StrictInferSchemaType} from './types'
import {Schema} from './types/schema'

export default async function isValid<TSchema extends Schema>(
  schema: TSchema,
  doc: StrictInferSchemaType<TSchema>,
  passedOptions = {},
  ...args
) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  return !validationErrors
}
