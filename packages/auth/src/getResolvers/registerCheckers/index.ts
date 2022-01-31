import {addPermissionChecker} from '@orion-js/resolvers'
import roles from './roles'
import requireUserId from './requireUserId'
import requireTwoFactor from './requireTwoFactor'

export default function (options) {
  addPermissionChecker(roles())
  addPermissionChecker(requireUserId())
  if (options.twoFactor) {
    addPermissionChecker(requireTwoFactor())
  }
}
