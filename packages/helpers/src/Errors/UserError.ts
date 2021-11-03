import {OrionError} from './OrionError'

export default class UserError extends OrionError {
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
        extra
      }
    }
  }
}
