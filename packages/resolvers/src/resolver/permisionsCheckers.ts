import {PermissionsError} from '@orion-js/helpers'
import {PermissionChecker, PermissionCheckerOptions} from './types'

declare const global: {
  checkers: PermissionChecker[]
}

global.checkers = []

export const addPermissionChecker = function (func: PermissionChecker) {
  global.checkers.push(func)
}

export const checkPermissions = async function (options: PermissionCheckerOptions) {
  for (const checker of global.checkers) {
    const errorMessage = await checker(options)
    if (errorMessage) {
      throw new PermissionsError(errorMessage)
    }
  }
}
