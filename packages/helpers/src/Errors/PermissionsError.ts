import {OrionError} from './OrionError'

export default class PermissionsError extends OrionError {
  constructor(permissionErrorType, extra: any = {}) {
    // Calling parent constructor of base Error class.
    const message =
      extra.message || `Client is not allowed to perform this action [${permissionErrorType}]`

    super(message)
    Error.captureStackTrace(this, this.constructor)

    this.isOrionError = true
    this.isPermissionsError = true
    this.code = 'PermissionsError'
    this.extra = extra

    this.getInfo = () => {
      return {
        ...extra,
        error: 'PermissionsError',
        message,
        type: permissionErrorType
      }
    }
  }
}
