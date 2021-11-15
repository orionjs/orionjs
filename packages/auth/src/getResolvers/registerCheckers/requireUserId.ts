import {PermissionChecker} from '@orion-js/resolvers'

export default () => {
  const checker: PermissionChecker = async options => {
    const requireUserId = options.resolver.permissionsOptions?.requireUserId

    if (requireUserId && !options.viewer?.userId) {
      return 'notLoggedIn'
    }
  }

  return checker
}
