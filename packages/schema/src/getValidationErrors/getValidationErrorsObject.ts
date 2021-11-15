import Dot from 'dot-object'

const dot = new Dot('.', false, true, false)

export default function getValidationErrorsObject(validationErrors: {key: string; code: string}[]) {
  if (validationErrors.length === 0) return null

  const errors = {}

  for (const validationError of validationErrors) {
    errors[validationError.key] = validationError.code
  }

  return dot.dot(errors)
}
