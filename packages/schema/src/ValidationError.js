import isArray from 'lodash/isArray'

const getValidationErrors = function(validationErrors) {
  const errors = {}

  for (const validationError of validationErrors) {
    errors[validationError.key] = validationError.code
  }

  return errors
}

export default class ValidationError extends Error {
  constructor(validationErrors) {
    if (!isArray(validationErrors)) {
      validationErrors = [validationErrors]
    }

    super('Validation Error')
    Error.captureStackTrace(this, this.constructor)

    this.code = 'validationError'
    this.isValidationError = true
    this.isOrionError = true
    this.validationErrors = validationErrors

    this.getInfo = () => {
      return {
        error: 'validationError',
        message: this.message,
        validationErrors: getValidationErrors(validationErrors)
      }
    }
  }
}
