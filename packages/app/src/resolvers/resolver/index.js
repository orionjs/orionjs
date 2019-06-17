import checkOptions from './checkOptions'
import getResolver from './getResolver'
import generateId from '../../helpers/generateId'
import getInvalidateCache from './getInvalidateCache'
import cleanParams from './cleanParams'

export default function({
  params: rawParams,
  returns,
  mutation,
  private: isPrivate,
  resolve,
  checkPermission,
  cache,
  getCacheKey,
  ...otherOptions
}) {
  const params = cleanParams(rawParams)

  checkOptions({
    params,
    returns,
    isPrivate,
    mutation,
    resolve,
    checkPermission,
    cache,
    getCacheKey,
    ...otherOptions
  })

  const resolverId = generateId()

  const resolver = getResolver({
    resolverId,
    cache,
    getCacheKey,
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
  resolver.getCacheKey = getCacheKey
  resolver.invalidateCache = getInvalidateCache(resolver)

  return resolver
}
