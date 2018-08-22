import PermissionsError from '../../Errors/PermissionsError'

const checkers = []

export const addPermissionChecker = function(func) {
  checkers.push(func)
}

export const checkPermissions = async function(...args) {
  for (const checker of checkers) {
    const errorMessage = await checker(...args)
    if (errorMessage) {
      throw new PermissionsError(errorMessage)
    }
  }
}
