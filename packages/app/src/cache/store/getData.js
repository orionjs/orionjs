export default async function(key) {
  const store = global.orionjsCache
  const stored = store[key]

  if (!stored) return
  if (stored.expires < new Date().getTime()) {
    delete store[key]
    return
  }

  return store[key]
}
