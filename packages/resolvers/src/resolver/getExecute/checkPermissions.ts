import {checkPermissions} from '../permisionsCheckers'
import {PermissionsError} from '@orion-js/helpers'
import {
  ExecuteOptions,
  GlobalCheckPermissions,
  ModelCheckPermissions,
  ResolverOptions
} from '../types'

export default async function (executeOptions: ExecuteOptions, options: ResolverOptions) {
  const {parent, params, viewer} = executeOptions

  if (viewer.app) return

  await checkPermissions({
    resolver: options,
    parent,
    params,
    viewer
  })

  if (options.checkPermission) {
    const execute = async () => {
      if (parent) {
        const checker = options.checkPermission as ModelCheckPermissions
        return checker(parent, params, viewer)
      } else {
        const checker = options.checkPermission as GlobalCheckPermissions
        return checker(params, viewer)
      }
    }

    const error = await execute()
    if (error) {
      throw new PermissionsError(error)
    }
  }
}
