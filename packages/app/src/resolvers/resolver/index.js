import checkOptions from './checkOptions'
import getResolver from './getResolver'
import generateId from '../../helpers/generateId'
import getInvalidateCache from './getInvalidateCache'

export default function({
  params,
  requireUserId,
  returns,
  mutation,
  private: isPrivate,
  resolve,
  checkPermission,
  roles = [],
  role,
  cache
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
    roles,
    cache
  })

  const resolverId = generateId()

  const resolver = getResolver({
    resolverId,
    cache,
    params,
    returns,
    resolve,
    requireUserId,
    roles,
    checkPermission
  })

  resolver.resolverId = resolverId
  resolver.params = params
  resolver.requireUserId = requireUserId
  resolver.returns = returns
  resolver.mutation = mutation
  resolver.checkPermission = checkPermission
  resolver.private = isPrivate
  resolver.resolve = resolver
  resolver.invalidateCache = getInvalidateCache(resolver)

  return resolver
}
