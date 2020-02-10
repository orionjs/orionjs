import isPlainObject from 'lodash/isPlainObject'

export default class ValidationError extends Error {
  constructor(validationErrors) {
    if (!isPlainObject(validationErrors)) {
      throw new Error('ValidationError must be initialized with an errors object')
    }

    const printableErrors = Object.keys(validationErrors)
      .map(key => {
        return `${key}: ${validationErrors[key]}`
      })
      .join(', ')
    const message = `Validation Error: {${printableErrors}}`
    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.code = 'validationError'
    this.isValidationError = true
    this.isOrionError = true
    this.validationErrors = validationErrors

    this.getInfo = () => {
      return {
        error: 'validationError',
        message: 'Validation Error',
        validationErrors: validationErrors
      }
    }

    this.prependKey = prepend => {
      const newErrors = {}

      const keys = Object.keys(this.validationErrors)

      for (const key of keys) {
        newErrors[`${prepend}.${key}`] = this.validationErrors[key]
      }

      return new ValidationError(newErrors)
    }
  }
}
