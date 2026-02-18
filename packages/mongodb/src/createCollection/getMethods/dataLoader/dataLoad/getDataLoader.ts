import DataLoader from 'dataloader'

export const cache = new Map<string, DataLoader<any, any>>()
const staleTimers = new Map<string, NodeJS.Timeout>()

interface Options {
  key: string
  func: (ids: Array<string>) => Promise<any>
  timeout: number
}

export const getDataLoader = (params: Options): DataLoader<any, any> => {
  const {key, func, timeout} = params

  const existing = cache.get(key)
  if (existing) return existing

  const load = async (ids: Array<string>) => {
    const staleTimer = staleTimers.get(key)
    if (staleTimer) {
      clearTimeout(staleTimer)
      staleTimers.delete(key)
    }
    cache.delete(key)
    return await func(ids)
  }

  const options = {
    batchScheduleFn: callback => setTimeout(callback, timeout),
  }

  const dataLoader = new DataLoader(load, options)

  // Safety cleanup for edge cases where the loader is created but never consumed.
  const staleTimer = setTimeout(
    () => {
      cache.delete(key)
      staleTimers.delete(key)
    },
    Math.max(100, timeout * 20),
  )
  staleTimer.unref?.()
  staleTimers.set(key, staleTimer)

  cache.set(key, dataLoader)

  return dataLoader
}
