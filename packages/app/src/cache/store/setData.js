export default async function(key, value, options) {
  const store = global.orionjsCache

  const stored = {
    expires: new Date().getTime() + options.ttl,
    value: value
  }

  store[key] = stored
}
