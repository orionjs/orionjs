import getValidationErrors from './getValidationErrors'
import {InferSchemaType} from './types'
import {Schema} from './types/schema'

export default async function isValid<TSchema extends Schema>(
  schema: TSchema,
  doc: InferSchemaType<TSchema>,
  passedOptions = {},
  ...args
) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  return !validationErrors
}
