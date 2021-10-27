import getCacheKey from './getCacheKey'
import {OrionResolvers} from '../ResolverTypes'

export default async function (
  options: OrionResolvers.ResolverOptions,
  executeOptions: OrionResolvers.ExecuteOptions
) {
  const {parent, params, viewer} = executeOptions
  const executeResolver = async (): Promise<any> => {
    if (parent) {
      const resultFunc = options.resolve as OrionResolvers.ModelResolve
      return await resultFunc(parent, params, viewer)
    } else {
      const resultFunc = options.resolve as OrionResolvers.GlobalResolve
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
