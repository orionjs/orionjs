import getValidationErrors from './getValidationErrors'

export default async function(schema, doc, ...args) {
  const validationErrors = await getValidationErrors(schema, doc, ...args)
  return !validationErrors
}
