import isArray from 'lodash/isArray'
import OrionError from '../OrionError'

const getErrorMessages = function(validationErrors) {
  const messages = {}

  for (const validationError of validationErrors) {
    messages[validationError.key] = validationError.message
  }

  return messages
}

export default class ValidationError extends OrionError {
  constructor(validationErrors) {
    if (!isArray(validationErrors)) {
      validationErrors = [validationErrors]
    }

    const first = validationErrors[0]

    super('validationError', first.message)
    Error.captureStackTrace(this, this.constructor)

    this.isValidationError = true
    this.validationErrors = validationErrors

    this.getInfo = () => {
      return {
        code: 'validationError',
        message: first.message,
        errorMessages: getErrorMessages(validationErrors)
      }
    }
  }
}
