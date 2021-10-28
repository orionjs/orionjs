import {validateKey, ValidationError} from '@orion-js/schema'

/**
 * Validates $unset
 */
export default async function({schema, operationDoc}) {
  const errors = {}
  for (const key of Object.keys(operationDoc)) {
    const error = await validateKey(schema, key, null)
    if (error) {
      errors[key] = error
    }
  }
  if (Object.keys(errors).length) {
    throw new ValidationError(errors)
  }
}
