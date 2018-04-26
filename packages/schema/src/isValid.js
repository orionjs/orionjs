import getValidationErrors from './getValidationErrors'

export default async function(schema, doc) {
  const validationErrors = await getValidationErrors(schema, doc)
  return !validationErrors
}
