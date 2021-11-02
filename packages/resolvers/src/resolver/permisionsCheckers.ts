import {PermissionsError} from '@orion-js/helpers'

global.checkers = []

export const addPermissionChecker = function (func) {
  global.checkers.push(func)
}

export const checkPermissions = async function (...args) {
  for (const checker of global.checkers) {
    const errorMessage = await checker(...args)
    if (errorMessage) {
      throw new PermissionsError(errorMessage)
    }
  }
}
