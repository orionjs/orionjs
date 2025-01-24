import includes from 'lodash/includes'
import { PermissionsError } from '@orion-js/app'

export default _options =>
  ({ roles, role }, viewer) => {
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
        /*
          roles used to be displayed in the error message, but it was removed for security reasons.
          The array is kept in the error object for backwards compatibility.
          Detected as a low security issue by the ethical hack performed by grep for yape. (12-2024)
        */
        throw new PermissionsError('missingRoles', { roles: [] })
      }
    }
  }
