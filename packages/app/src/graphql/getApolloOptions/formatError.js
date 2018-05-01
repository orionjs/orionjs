export default function(apolloError) {
  const response = {...apolloError}
  const error = apolloError.originalError

  if (error && error.isValidationError) {
    response.validationErrors = error.validationErrors
  }

  return response
}
