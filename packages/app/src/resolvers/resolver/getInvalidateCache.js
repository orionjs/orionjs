import cache from '../../cache'
import getCacheKey from './getCacheKey'

export default function(resolver) {
  return async function(params, parent) {
    const cacheKey = getCacheKey({parent, callParams: params, resolverId: resolver.resolverId})
    await cache.invalidate(cacheKey)
  }
}
