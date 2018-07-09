import cache from '../../cache'
import getCacheKey from './getCacheKey'

export default function(resolver) {
  return async function(params, parent) {
    const cacheKey = getCacheKey({parent, callParams: params, resolverId: resolver.resolverId})
    console.log('will invalidate cache', params, parent, {cacheKey})
    await cache.invalidate(cacheKey)
  }
}
