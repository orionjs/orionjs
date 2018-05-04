import PermissionsError from '../../Errors/PermissionsError'
import checkOptions from './checkOptions'
import validate from './validate'

export default function({
  name,
  params,
  requireUserId,
  returns,
  mutation,
  private: isPrivate,
  resolve,
  checkPermission
}) {
  checkOptions({
    name,
    params,
    requireUserId,
    returns,
    mutation,
    resolve,
    checkPermission
  })
  return {
    name,
    params,
    requireUserId,
    returns,
    mutation,
    checkPermission,
    private: isPrivate,
    resolve: async (...args) => {
      const callParams = args[args.length - 2]
      const viewer = args[args.length - 1]

      if (requireUserId && !viewer.userId) {
        throw new PermissionsError('notLoggedIn')
      }

      if (checkPermission) {
        const error = await checkPermission(callParams, viewer)
        if (error) {
          throw new PermissionsError(error)
        }
      }

      if (params) {
        const options = {}
        await validate(params, callParams, viewer)
      }

      return await resolve(...args)
    }
  }
}
