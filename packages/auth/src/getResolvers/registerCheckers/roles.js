import includes from 'lodash/includes'
import {PermissionsError} from '@orion-js/app'

export default options =>
  function({roles, role}, viewer) {
    if (!roles) roles = []

    if (role) {
      roles.push(role)
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
  }
