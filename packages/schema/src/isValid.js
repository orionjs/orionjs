import getValidationErrors from './getValidationErrors'

export default async function(...args) {
  const validationErrors = await getValidationErrors(...args)
  return !validationErrors
}
