export default function (apolloError) {
  let response = {...apolloError}
  const error = apolloError.originalError

  if (error && error.isValidationError) {
    response.validationErrors = error.validationErrors
  }

  if (error && error.getInfo) {
    response = error.getInfo()
  }

  return response
}
