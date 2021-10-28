import DataLoader from 'dataloader'

export const cache = new Map()

interface Options {
  key: string
  func: (ids: Array<string>) => Promise<any>
  timeout: number
}

export const getDataLoader = function (params: Options): DataLoader<any, any> {
  const {key, func, timeout} = params

  const existing = cache.get(key)
  if (existing) return existing

  const load = async (ids: Array<string>) => {
    cache.delete(key)
    return await func(ids)
  }

  const options = {
    batchScheduleFn: callback => setTimeout(callback, timeout)
  }

  const dataLoader = new DataLoader(load, options)

  cache.set(key, dataLoader)

  return dataLoader
}
