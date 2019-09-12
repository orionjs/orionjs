export default class PermissionsError extends Error {
  constructor(permissionErrorType, otherInfo = {}) {
    // Calling parent constructor of base Error class.
    const message =
      otherInfo.message || `Client is not allowed to perform this action [${permissionErrorType}]`
    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.isOrionError = true
    this.isPermissionsError = true
    this.code = PermissionsError
    this.otherInfo = otherInfo

    this.getInfo = () => {
      return {
        ...otherInfo,
        error: 'PermissionsError',
        message,
        type: permissionErrorType
      }
    }
  }
}
