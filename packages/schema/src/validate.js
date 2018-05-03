import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'

export default async function(schema, doc, ...args) {
  const validationErrors = await getValidationErrors(schema, doc, ...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
