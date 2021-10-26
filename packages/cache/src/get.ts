const promises = {}

export default function(store) {
  const getData = async function(key, {fallback, ttl} = {}) {
    const saved = await store.get(key)
    if (saved) return saved
    if (!fallback) return

    const newResult = await fallback()
    await store.set(key, newResult, {ttl})
    return {value: newResult}
  }

  return function(key, options) {
    return new Promise(async function(resolve, reject) {
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
