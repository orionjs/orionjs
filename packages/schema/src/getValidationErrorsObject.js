export default function(validationErrors) {
  const errors = {}

  for (const validationError of validationErrors) {
    errors[validationError.key] = validationError.code
  }

  return errors
}
