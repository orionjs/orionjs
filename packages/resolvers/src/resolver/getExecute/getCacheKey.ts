import {hashObject} from '@orion-js/helpers'
import {OrionResolvers} from '../ResolverTypes'

const getBaseKey = async (
  options: OrionResolvers.ResolverOptions,
  executeOptions: OrionResolvers.ExecuteOptions
) => {
  const {parent, params, viewer} = executeOptions
  if (parent) {
    const getKey = options.getCacheKey as OrionResolvers.ModelGetCacheKey
    return await getKey(parent, params, viewer)
  } else {
    const getKey = options.getCacheKey as OrionResolvers.GlobalGetCacheKey
    return await getKey(params, viewer)
  }
}

export default async function (
  options: OrionResolvers.ResolverOptions,
  executeOptions: OrionResolvers.ExecuteOptions
): Promise<string> {
  const {parent, params, viewer} = executeOptions
  if (options.getCacheKey) {
    const baseKey = await getBaseKey(options, executeOptions)
    return options.resolverId + '_' + baseKey
  } else {
    const key = hashObject({parent, params, resolverId: options.resolverId})
    return key
  }
}
