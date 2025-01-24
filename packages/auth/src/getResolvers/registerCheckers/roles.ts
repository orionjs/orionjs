import includes from 'lodash/includes'
import {PermissionsError} from '@orion-js/helpers'
import {PermissionChecker} from '@orion-js/resolvers'

export default () => {
  const checker: PermissionChecker = async options => {
    const {roles = [], role}: {roles: string[]; role: string | undefined} = options.resolver
      .permissionsOptions
      ? options.resolver.permissionsOptions
      : {}

    if (role) {
      roles.push(role)
    }

    if (roles.length) {
      let hasPermission = false
      for (const requiredRole of roles) {
        if (includes(options.viewer?.roles, requiredRole)) {
          hasPermission = true
        }
      }
      if (!hasPermission) {
        /*
          roles used to be displayed in the error message, but it was removed for security reasons.
          The array is kept in the error object for backwards compatibility.
          Detected as a low security issue by the ethical hack performed by grep for yape. (12-2024)
        */
        throw new PermissionsError('missingRoles', {roles: []})
      }
    }
  }

  return checker
}
