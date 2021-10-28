import dot from 'dot-object'

export default function getValidationErrorsObject(validationErrors: {key: string; code: string}[]) {
  if (validationErrors.length === 0) return null

  const errors = {}

  for (const validationError of validationErrors) {
    errors[validationError.key] = validationError.code
  }

  return dot.dot(errors)
}
