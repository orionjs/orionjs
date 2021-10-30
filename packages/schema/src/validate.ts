import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'
import {Schema} from './types/schema'

export default async function validate(schema: Schema, doc: any, passedOptions = {}, ...args) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
