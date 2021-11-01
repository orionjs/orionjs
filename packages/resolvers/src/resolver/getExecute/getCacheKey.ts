import {hashObject} from '@orion-js/helpers'
import {ResolverOptions, ExecuteOptions, ModelGetCacheKey, GlobalGetCacheKey} from '../types'

const getBaseKey = async (options: ResolverOptions, executeOptions: ExecuteOptions) => {
  const {parent, params, viewer} = executeOptions
  if (parent) {
    const getKey = options.getCacheKey as ModelGetCacheKey
    return await getKey(parent, params, viewer)
  } else {
    const getKey = options.getCacheKey as GlobalGetCacheKey
    return await getKey(params, viewer)
  }
}

export default async function (
  options: ResolverOptions,
  executeOptions: ExecuteOptions
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
