import {type} from 'rambdax'

export interface ValidationErrorInfo {
  error: string
  message: string
  validationErrors: Record<string, string>
  labels: Record<string, string>
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

const cleanLabels = (
  labels: Record<string, string>,
  validationErrors: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {}

  for (const key of Object.keys(validationErrors)) {
    if (labels[key]) {
      result[key] = labels[key]
    }
  }

  return result
}

export default class ValidationError extends Error {
  public code: string
  public isValidationError: boolean
  public isOrionError: boolean
  public validationErrors: Record<string, string>
  public labels: Record<string, string>

  constructor(validationErrors: Record<string, string>, labels: Record<string, string> = {}) {
    super(getPrintableError(validationErrors))

    if (type(validationErrors) !== 'Object') {
      throw new Error('ValidationError must be initialized with an errors object')
    }

    Error.captureStackTrace(this, this.constructor)

    this.code = 'validationError'
    this.isValidationError = true
    this.isOrionError = true
    this.validationErrors = validationErrors
    this.labels = cleanLabels(labels, validationErrors)

    this.getInfo()
  }

  public getInfo = (): ValidationErrorInfo => {
    return {
      error: 'validationError',
      message: 'Validation Error',
      validationErrors: this.validationErrors,
      labels: this.labels,
    }
  }

  public prependKey = prepend => {
    const newErrors = {}

    const keys = Object.keys(this.validationErrors)

    for (const key of keys) {
      newErrors[`${prepend}.${key}`] = this.validationErrors[key]
    }

    const newFieldLabels = {}

    for (const key of Object.keys(this.labels)) {
      newFieldLabels[`${prepend}.${key}`] = this.labels[key]
    }

    return new ValidationError(newErrors, newFieldLabels)
  }
}
