/**
 * Returns the stored data in the cache
 * @param key Cache key
 */
export default async function (key: string) {
  const store = global.orionjsCache
  const stored = store[key]

  if (!stored) return
  if (stored.expires < new Date().getTime()) {
    delete store[key]
    return
  }

  return store[key]
}
