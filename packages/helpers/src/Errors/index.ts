/**
 * @file Exports all error classes used in the Orion framework
 */

import {OrionError} from './OrionError'
import type {OrionErrorInformation} from './OrionError'
import PermissionsError from './PermissionsError'
import UserError from './UserError'

/**
 * Re-export all error types for convenient importing
 */
export {OrionError, PermissionsError, UserError}
export type {OrionErrorInformation}

/**
 * Type guard to check if an error is an OrionError
 *
 * @param error - Any error object to test
 * @returns True if the error is an OrionError instance
 *
 * @example
 * try {
 *   // some code that might throw
 * } catch (error) {
 *   if (isOrionError(error)) {
 *     // Handle Orion-specific error
 *     console.log(error.code, error.getInfo())
 *   } else {
 *     // Handle general error
 *   }
 * }
 */
export function isOrionError(error: any): error is OrionError {
  return Boolean(error && typeof error === 'object' && error.isOrionError === true)
}

/**
 * Type guard to check if an error is a UserError
 *
 * @param error - Any error object to test
 * @returns True if the error is a UserError instance
 */
export function isUserError(error: any): error is UserError {
  return Boolean(
    error && typeof error === 'object' && error.isOrionError === true && error.isUserError === true,
  )
}

/**
 * Type guard to check if an error is a PermissionsError
 *
 * @param error - Any error object to test
 * @returns True if the error is a PermissionsError instance
 */
export function isPermissionsError(error: any): error is PermissionsError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      error.isOrionError === true &&
      error.isPermissionsError === true,
  )
}
