import {hashObject} from '@orion-js/helpers'
import {ExecuteOptions, ModelGetCacheKey, GlobalGetCacheKey} from '../types'

const getBaseKey = async (executeOptions: ExecuteOptions) => {
  const {parent, params, viewer, info, options} = executeOptions
  if (parent) {
    const getKey = options.getCacheKey as ModelGetCacheKey
    return await getKey(parent, params, viewer, info)
  }
  const getKey = options.getCacheKey as GlobalGetCacheKey
  return await getKey(params, viewer, info)
}

export default async function (executeOptions: ExecuteOptions): Promise<string> {
  const {parent, params, options} = executeOptions
  if (options.getCacheKey) {
    const baseKey = await getBaseKey(executeOptions)
    return `${options.resolverId}_${baseKey}`
  }
  const key = hashObject({parent, params, resolverId: options.resolverId})
  return key
}
