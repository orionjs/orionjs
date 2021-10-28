import {validateKey, ValidationError} from '@orion-js/schema'

/**
 * Validates $inc
 */
export default async function ({schema, operationDoc}) {
  const errors = {}
  for (const key of Object.keys(operationDoc)) {
    const value = operationDoc[key]
    const error = await validateKey(schema, key, value)
    if (error) {
      errors[key] = error
    }
  }
  if (Object.keys(errors).length) {
    throw new ValidationError(errors)
  }
}
