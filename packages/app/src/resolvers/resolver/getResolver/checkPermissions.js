import PermissionsError from '../../../Errors/PermissionsError'
import {checkPermissions} from '../permisionsCheckers'

export default async function({parent, callParams, viewer, checkPermission, otherOptions}) {
  if (viewer.app) return

  if (checkPermission) {
    const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]
    const error = await checkPermission(...resolveArgs)
    if (error) {
      throw new PermissionsError(error)
    }
  } else {
    await checkPermissions(otherOptions, viewer, {
      parent,
      params: callParams
    })
  }
}
