import cache from '../../../cache'
import getCacheKey from '../getCacheKey'

export default async function({
  cache: cacheTTL,
  getCacheKey: customGetCacheKey,
  resolverId,
  parent,
  callParams,
  viewer,
  resolve
}) {
  const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]

  if (cacheTTL) {
    const key = await getCacheKey({parent, customGetCacheKey, viewer, callParams, resolverId})
    const result = await cache.get(key, {
      fallback: () => resolve(...resolveArgs),
      ttl: cacheTTL
    })
    return result.value
  } else {
    return await resolve(...resolveArgs)
  }
}
