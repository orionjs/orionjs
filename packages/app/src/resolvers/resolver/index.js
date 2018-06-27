import PermissionsError from '../../Errors/PermissionsError'
import checkOptions from './checkOptions'
import {validate, clean} from '@orion-js/schema'
import getArgs from './getArgs'
import includes from 'lodash/includes'
import getSchema from './getSchema'
import isArray from 'lodash/isArray'

export default function({
  params,
  requireUserId,
  returns,
  mutation,
  private: isPrivate,
  resolve,
  checkPermission,
  roles = [],
  role
}) {
  if (role) {
    roles.push(role)
  }

  checkOptions({
    params,
    requireUserId,
    returns,
    isPrivate,
    mutation,
    resolve,
    checkPermission,
    roles
  })

  const resolver = async function(...args) {
    let {parent, callParams, viewer} = getArgs(...args)

    if (!viewer.app) {
      if (requireUserId && !viewer.userId) {
        throw new PermissionsError('notLoggedIn')
      }

      if (roles.length) {
        let hasPermission = false
        for (const requiredRole of roles) {
          if (includes(viewer.roles, requiredRole)) {
            hasPermission = true
          }
        }
        if (!hasPermission) {
          throw new PermissionsError('missingRoles', {roles})
        }
      }

      if (checkPermission) {
        const error = await checkPermission(callParams, viewer)
        if (error) {
          throw new PermissionsError(error)
        }
      }
    }

    if (params) {
      const options = {}
      const schema = getSchema(params, callParams, options, viewer)
      callParams = await clean(schema, callParams, options, viewer)
      await validate(schema, callParams, options, viewer)
    }

    const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]
    let result = await resolve(...resolveArgs)

    if (returns) {
      if (isArray(returns) && returns[0].__isModel) {
        if (isArray(result)) {
          result = result.map(item => returns[0].initItem(item))
        } else {
          console.warn(`A resolver did not return an array when it should`, result)
        }
      } else if (returns.__isModel) {
        result = returns.initItem(result)
      }
    }

    return result
  }

  resolver.params = params
  resolver.requireUserId = requireUserId
  resolver.returns = returns
  resolver.mutation = mutation
  resolver.checkPermission = checkPermission
  resolver.private = isPrivate
  resolver.resolve = resolver

  return resolver
}
