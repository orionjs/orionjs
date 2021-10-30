import getValidationErrors from './getValidationErrors'
import {Schema} from './types/schema'

export default async function isValid(schema: Schema, doc: any, passedOptions = {}, ...args) {
  const validationErrors = await getValidationErrors(schema, doc, passedOptions, ...args)
  return !validationErrors
}
