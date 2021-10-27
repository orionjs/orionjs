export default async function (key: string) {
  const store = global.orionjsCache

  if (store[key]) {
    const timeout = store[key].timeout
    if (timeout) {
      clearTimeout(timeout)
    }
  }

  delete store[key]
}
