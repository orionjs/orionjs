import getCacheKey from './getCacheKey'
import {ResolverOptions, ExecuteOptions} from '../types'

export default async function (options: ResolverOptions, executeOptions: ExecuteOptions) {
  const {parent, params, viewer} = executeOptions
  const executeResolver = async (): Promise<any> => {
    const resultFunc = options.resolve as (...args: any) => any
    if (parent) {
      return await resultFunc(parent, params, viewer)
    } else {
      return await resultFunc(params, viewer)
    }
  }

  if (options.cache && options.cacheProvider) {
    const key = await getCacheKey(options, executeOptions)
    const result = await options.cacheProvider.get(key, {
      fallback: executeResolver,
      ttl: options.cache
    })
    return result.value
  } else {
    return await executeResolver()
  }
}
