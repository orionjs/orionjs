import isPlainObject from 'lodash/isPlainObject'

export interface ValidationErrorInfo {
  error: string
  message: string
  validationErrors: object
}

const getPrintableError = (validationErrors: object): string => {
  const printableErrors = Object.keys(validationErrors)
    .map(key => {
      return `${key}: ${validationErrors[key]}`
    })
    .join(', ')
  const message = `Validation Error: {${printableErrors}}`
  return message
}

export default class ValidationError extends Error {
  public code: string
  public isValidationError: boolean
  public isOrionError: boolean
  public validationErrors: object

  constructor(validationErrors: object) {
    super(getPrintableError(validationErrors))

    if (!isPlainObject(validationErrors)) {
      throw new Error('ValidationError must be initialized with an errors object')
    }

    Error.captureStackTrace(this, this.constructor)

    this.code = 'validationError'
    this.isValidationError = true
    this.isOrionError = true
    this.validationErrors = validationErrors

    this.getInfo
  }

  public getInfo = (): ValidationErrorInfo => {
    return {
      error: 'validationError',
      message: 'Validation Error',
      validationErrors: this.validationErrors
    }
  }

  public prependKey = prepend => {
    const newErrors = {}

    const keys = Object.keys(this.validationErrors)

    for (const key of keys) {
      newErrors[`${prepend}.${key}`] = this.validationErrors[key]
    }

    return new ValidationError(newErrors)
  }
}
