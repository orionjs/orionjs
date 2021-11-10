import {PermissionChecker} from '@orion-js/resolvers'
import requireTwoFactorFunc from '../../helpers/requireTwoFactor'

const buildTwoFactorChecker = ({Users}) => {
  const checker: PermissionChecker = async options => {
    const requireTwoFactor = options.resolver.permissionsOptions?.requireTwoFactor
    if (!requireTwoFactor) return
    await requireTwoFactorFunc(options.viewer)
  }

  return checker
}

export default buildTwoFactorChecker
