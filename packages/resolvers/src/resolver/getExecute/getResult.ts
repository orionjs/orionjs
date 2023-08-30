import getCacheKey from './getCacheKey'
import {ResolverOptions, ExecuteOptions} from '../types'

export default async function (executeOptions: ExecuteOptions) {
  const {parent, params, viewer, options} = executeOptions
  const executeResolver = async (): Promise<any> => {
    const resultFunc = options.resolve as (...args: any) => any
    if (parent) {
      return await resultFunc(parent, params, viewer)
    } else {
      return await resultFunc(params, viewer)
    }
  }

  if (options.cache && options.cacheProvider) {
    const key = await getCacheKey(executeOptions)
    const result = await options.cacheProvider.get(key, {
      fallback: executeResolver,
      ttl: options.cache
    })
    return result.value
  } else {
    return await executeResolver()
  }
}
