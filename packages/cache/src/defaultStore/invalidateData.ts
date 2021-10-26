export default async function(key) {
  const store = global.orionjsCache

  delete store[key]
}
