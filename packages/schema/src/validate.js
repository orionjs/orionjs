import ValidationError from './ValidationError'
import getValidationErrors from './getValidationErrors'

export default async function(...args) {
  const validationErrors = await getValidationErrors(...args)
  if (validationErrors) {
    throw new ValidationError(validationErrors)
  }
}
