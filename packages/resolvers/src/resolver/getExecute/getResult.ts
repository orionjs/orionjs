import getCacheKey from './getCacheKey'
import {ExecuteOptions} from '../types'

export default async function (executeOptions: ExecuteOptions) {
  const {parent, params, viewer, info, options} = executeOptions
  const executeResolver = async (): Promise<any> => {
    const resultFunc = options.resolve as (...args: any) => any
    if (parent) {
      return await resultFunc(parent, params, viewer, info)
    }
    return await resultFunc(params, viewer, info)
  }

  if (options.cache && options.cacheProvider) {
    const key = await getCacheKey(executeOptions)
    const result = await options.cacheProvider.get(key, {
      fallback: executeResolver,
      ttl: options.cache,
    })
    return result.value
  }
  return await executeResolver()
}
