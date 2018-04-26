import isPlainObject from 'lodash/isPlainObject'

export default class ValidationError extends Error {
  constructor(validationErrors) {
    if (!isPlainObject(validationErrors)) {
      throw new Error('ValidationError must be initialized with an errors object')
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
        validationErrors: validationErrors
      }
    }
  }
}
