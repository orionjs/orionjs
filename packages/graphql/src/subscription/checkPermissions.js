import includes from 'lodash/includes'
import {PermissionsError} from '@orion-js/app'

export default async function({roles, requireUserId, checkPermission}, callParams, viewer) {
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
