import hashObject from '../../helpers/hashObject'

export default async function({parent, customGetCacheKey, viewer, callParams, resolverId}) {
  if (customGetCacheKey) {
    const resolveArgs = parent ? [parent, callParams, viewer] : [callParams, viewer]
    const key = await customGetCacheKey(...resolveArgs)
    return resolverId + '_' + key
  } else {
    const key = hashObject({parent, callParams, resolverId})
    return key
  }
}
