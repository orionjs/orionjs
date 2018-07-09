import cache from '../../../cache'
import getCacheKey from '../getCacheKey'

export default async function({cache: cacheTTL, resolverId, parent, callParams, viewer, resolve}) {
  const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]

  if (cacheTTL) {
    const key = getCacheKey({parent, callParams, resolverId})
    const result = await cache.get(key)
    if (result) {
      return result.value
    } else {
      const newResult = await resolve(...resolveArgs)
      cache.set(key, newResult, {ttl: cacheTTL})
      return newResult
    }
  } else {
    return await resolve(...resolveArgs)
  }
}
