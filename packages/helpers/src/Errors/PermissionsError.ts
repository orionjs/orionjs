import {OrionError} from './OrionError'

/**
 * Error class for permission-related errors in the Orion framework.
 *
 * PermissionsError represents authorization failures where a user or client
 * attempts to perform an action they don't have permission to execute.
 * This is used to distinguish security/permissions errors from other types
 * of errors for proper error handling and user feedback.
 *
 * @extends OrionError
 */
export default class PermissionsError extends OrionError {
  /**
   * Creates a new PermissionsError instance.
   *
   * @param permissionErrorType - Identifies the specific permission that was violated
   *                              (e.g., 'read', 'write', 'admin')
   * @param extra - Additional error context or metadata. Can include a custom message
   *                via the message property.
   *
   * @example
   * // Basic usage
   * throw new PermissionsError('delete_document')
   *
   * @example
   * // With custom message
   * throw new PermissionsError('access_admin', { message: 'Admin access required' })
   *
   * @example
   * // With additional context
   * throw new PermissionsError('edit_user', {
   *   userId: 'user123',
   *   requiredRole: 'admin'
   * })
   */
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
        type: permissionErrorType,
      }
    }
  }
}
