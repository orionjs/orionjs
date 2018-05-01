export default class ConfigurationError extends Error {
  constructor(message) {
    // Calling parent constructor of base Error class.
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}
