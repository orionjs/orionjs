import includes from 'lodash/includes'
import PermissionsError from '../../../Errors/PermissionsError'

export default async function({viewer, callParams, requireUserId, roles, checkPermission}) {
  if (!viewer.app) {
    if (requireUserId && !viewer.userId) {
      throw new PermissionsError('notLoggedIn')
    }

    if (roles.length) {
      let hasPermission = false
      for (const requiredRole of roles) {
        if (includes(viewer.roles, requiredRole)) {
          hasPermission = true
        }
      }
      if (!hasPermission) {
        throw new PermissionsError('missingRoles', {roles})
      }
    }

    if (checkPermission) {
      const error = await checkPermission(callParams, viewer)
      if (error) {
        throw new PermissionsError(error)
      }
    }
  }
}
