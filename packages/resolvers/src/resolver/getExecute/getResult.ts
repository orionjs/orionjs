import getCacheKey from './getCacheKey'
import {
  ResolverOptions,
  ExecuteOptions,
  ModelResolverResolve,
  GlobalResolverResolve
} from '../types'

export default async function (options: ResolverOptions, executeOptions: ExecuteOptions) {
  const {parent, params, viewer} = executeOptions
  const executeResolver = async (): Promise<any> => {
    if (parent) {
      const resultFunc = options.resolve as ModelResolverResolve
      return await resultFunc(parent, params, viewer)
    } else {
      const resultFunc = options.resolve as GlobalResolverResolve
      return await resultFunc(params, viewer)
    }
  }

  if (options.cache) {
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
