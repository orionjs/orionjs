export default class UserError extends Error {
  constructor(code, message, extra) {
    // Calling parent constructor of base Error class.
    if (!message && code) {
      message = code
      code = 'error'
    }
    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.isOrionError = true
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
