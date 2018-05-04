export default class PermissionsError extends Error {
  constructor(permissionErrorType) {
    // Calling parent constructor of base Error class.
    const message = `Client is not allowed to perform this action [${permissionErrorType}]`
    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.isOrionError = true
    this.code = PermissionsError

    this.getInfo = () => {
      return {
        error: 'PermissionsError',
        message,
        type: permissionErrorType
      }
    }
  }
}
