export interface EchoesErrorInfo {
  error: string
  message: string
  extra?: any
  validationErrors?: Record<string, string>
  labels?: Record<string, string>
}

export class EchoesUserError extends Error {
  readonly isEchoesError = true
  readonly isOrionError = true
  readonly isUserError = true
  readonly code: string
  readonly extra: any

  constructor(code: string, message?: string, extra?: any) {
    if (!message) {
      message = code
      code = 'error'
    }
    super(message)
    this.name = 'EchoesUserError'
    this.code = code
    this.extra = extra
  }

  getInfo(): EchoesErrorInfo {
    return {error: this.code, message: this.message, extra: this.extra}
  }
}

export class EchoesValidationError extends Error {
  readonly isEchoesError = true
  readonly isOrionError = true
  readonly isValidationError = true
  readonly code = 'validationError'
  readonly validationErrors: Record<string, string>
  readonly labels: Record<string, string>

  constructor(validationErrors: Record<string, string>, labels: Record<string, string> = {}) {
    const printableErrors = Object.entries(validationErrors)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    super(`Validation Error: {${printableErrors}}`)
    this.name = 'EchoesValidationError'
    this.validationErrors = validationErrors
    this.labels = Object.fromEntries(
      Object.keys(validationErrors)
        .filter(key => labels[key])
        .map(key => [key, labels[key]]),
    )
  }

  getInfo(): EchoesErrorInfo {
    return {
      error: this.code,
      message: 'Validation Error',
      validationErrors: this.validationErrors,
      labels: this.labels,
    }
  }
}
