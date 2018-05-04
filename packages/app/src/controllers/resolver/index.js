import {validate} from '@orion-js/schema'
import PermissionsError from '../../Errors/PermissionsError'

export default function({
  name,
  params,
  requireUserId,
  returns,
  mutation,
  private: isPrivate,
  resolve
}) {
  return {
    name,
    params,
    requireUserId,
    returns,
    mutation,
    private: isPrivate,
    resolve: async (...args) => {
      const callParams = args[args.length - 2]
      const viewer = args[args.length - 1]

      if (requireUserId && !viewer.userId) {
        throw new PermissionsError('notLoggedIn')
      }

      if (params) {
        await validate(params, callParams, viewer)
      }

      return await resolve(...args)
    }
  }
}
