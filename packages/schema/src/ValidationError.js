import isArray from 'lodash/isArray'
import getValidationErrorsObject from './getValidationErrorsObject'

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
        validationErrors: getValidationErrorsObject(validationErrors)
      }
    }
  }
}
