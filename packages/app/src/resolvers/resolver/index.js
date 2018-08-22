import checkOptions from './checkOptions'
import getResolver from './getResolver'
import generateId from '../../helpers/generateId'
import getInvalidateCache from './getInvalidateCache'

export default function({
  params,
  returns,
  mutation,
  private: isPrivate,
  resolve,
  checkPermission,
  cache,
  ...otherOptions
}) {
  checkOptions({
    params,
    returns,
    isPrivate,
    mutation,
    resolve,
    checkPermission,
    cache,
    ...otherOptions
  })

  const resolverId = generateId()

  const resolver = getResolver({
    resolverId,
    cache,
    params,
    returns,
    resolve,
    checkPermission,
    ...otherOptions
  })

  resolver.resolverId = resolverId
  resolver.params = params
  resolver.options = otherOptions
  resolver.returns = returns
  resolver.mutation = mutation
  resolver.checkPermission = checkPermission
  resolver.private = isPrivate
  resolver.resolve = resolver
  resolver.invalidateCache = getInvalidateCache(resolver)

  return resolver
}
