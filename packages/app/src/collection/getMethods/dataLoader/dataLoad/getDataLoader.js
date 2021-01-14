/* global Map */
import DataLoader from 'dataloader'

export const cache = new Map()

export const getDataLoader = function (key, func, options) {
  const stringKey = JSON.stringify(key)

  const existing = cache.get(stringKey)
  if (existing) return existing

  const dataLoader = new DataLoader(async (...args) => {
    cache.delete(stringKey)
    return await func(...args)
  }, options)
  cache.set(stringKey, dataLoader)

  return dataLoader
}
