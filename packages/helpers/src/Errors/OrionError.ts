/**
 * Interface representing the standardized error information structure for Orion errors.
 * This is used by the getInfo method to provide consistent error reporting.
 */
export interface OrionErrorInformation {
  /** The error code or identifier */
  error: string
  /** Human-readable error message */
  message: string
  /** Additional error metadata or context */
  extra: any
  /** The sub-type of error. For example for permissions errors it could be 'read', 'write', 'admin' */
  type?: string
}

/**
 * Base error class for all Orion-specific errors.
 * 
 * This abstract class provides common properties and methods for all error types
 * used in the Orion framework. It's extended by more specific error classes
 * like UserError and PermissionsError.
 * 
 * @property isOrionError - Flag indicating this is an Orion error (always true)
 * @property isUserError - Flag indicating if this is a user-facing error
 * @property isPermissionsError - Flag indicating if this is a permissions-related error
 * @property code - Error code for identifying the error type
 * @property extra - Additional error context or metadata
 */
export class OrionError extends Error {
  isOrionError = true

  isUserError: boolean
  isPermissionsError: boolean
  code: string
  extra: any

  /**
   * Returns a standardized representation of the error information.
   * @returns An object containing error details in a consistent format
   */
  getInfo: () => OrionErrorInformation
}
