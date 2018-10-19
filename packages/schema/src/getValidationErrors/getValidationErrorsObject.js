import dot from 'dot-object'

export default function(validationErrors) {
  if (validationErrors.length === 0) return null

  const errors = {}

  for (const validationError of validationErrors) {
    errors[validationError.key] = validationError.code
  }

  return dot.dot(errors)
}
