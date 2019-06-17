import cache from '../../cache'
import getCacheKey from './getCacheKey'

export default function(resolver) {
  return async function(params, parent, viewer) {
    const cacheKey = await getCacheKey({
      parent,
      callParams: params,
      viewer,
      customGetCacheKey: resolver.getCacheKey,
      resolverId: resolver.resolverId
    })
    await cache.invalidate(cacheKey)
  }
}
