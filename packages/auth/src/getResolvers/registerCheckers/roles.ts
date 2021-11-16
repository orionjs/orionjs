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
        throw new PermissionsError('missingRoles', {roles})
      }
    }
  }

  return checker
}
