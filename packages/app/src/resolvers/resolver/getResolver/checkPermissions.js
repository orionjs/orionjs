import includes from 'lodash/includes'
import PermissionsError from '../../../Errors/PermissionsError'

export default async function({parent, callParams, viewer, requireUserId, roles, checkPermission}) {
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
      const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]
      const error = await checkPermission(...resolveArgs)
      if (error) {
        throw new PermissionsError(error)
      }
    }
  }
}
