import {CacheStore, GetCacheOptions, StoredCacheData} from './CacheStoreType'

const promises = {}

export default function (store: CacheStore) {
  const getData = async function (key: string, {fallback, ttl}: GetCacheOptions = {}) {
    const saved = await store.get(key)
    if (saved) return saved
    if (!fallback) return

    const newResult = await fallback()
    await store.set(key, newResult, {ttl})
    return {value: newResult}
  }

  return (key: string, options: GetCacheOptions): Promise<StoredCacheData> => {
    return new Promise(async function (resolve, reject) {
      promises[key] = promises[key] || []

      promises[key].push({resolve, reject})
      if (promises[key].length > 1) return

      try {
        const result = await getData(key, options)
        for (const {resolve} of promises[key]) {
          resolve(result)
        }
      } catch (error) {
        for (const {reject} of promises[key]) {
          reject(error)
        }
      }
      delete promises[key]
    })
  }
}
