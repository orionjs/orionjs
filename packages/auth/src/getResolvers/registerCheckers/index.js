import {addPermissionChecker} from '@orion-js/app'
import roles from './roles'
import requireUserId from './requireUserId'
import requireTwoFactor from './requireTwoFactor'

export default function(options) {
  addPermissionChecker(roles(options))
  addPermissionChecker(requireUserId(options))
  if (options.twoFactor) {
    addPermissionChecker(requireTwoFactor(options))
  }
}
