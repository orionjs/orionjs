import {OrionError} from './OrionError'

/**
 * Error class for user-facing errors in the Orion framework.
 *
 * UserError is designed to represent errors that should be displayed to end users,
 * as opposed to system errors or unexpected failures. These errors typically represent
 * validation issues, business rule violations, or other expected error conditions.
 *
 * @extends OrionError
 */
export default class UserError extends OrionError {
  /**
   * Creates a new UserError instance.
   *
   * @param code - Error code identifier. If only one parameter is provided,
   *               this will be used as the message and code will default to 'error'.
   * @param message - Human-readable error message. Optional if code is provided.
   * @param extra - Additional error context or metadata.
   *
   * @example
   * // Basic usage
   * throw new UserError('invalid_input', 'The provided email is invalid')
   *
   * @example
   * // Using only a message (code will be 'error')
   * throw new UserError('Input validation failed')
   *
   * @example
   * // With extra metadata
   * throw new UserError('rate_limit', 'Too many requests', { maxRequests: 100 })
   */
  constructor(code: string, message?: string, extra?: any) {
    if (!message && code) {
      message = code
      code = 'error'
    }

    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.isOrionError = true
    this.isUserError = true
    this.code = code
    this.extra = extra

    this.getInfo = () => {
      return {
        error: code,
        message,
        extra,
      }
    }
  }
}
