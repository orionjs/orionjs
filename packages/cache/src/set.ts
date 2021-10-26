const defaultOptions = {
  ttl: 10000 // ten seconds
}

export default function(store) {
  return async function(key, value, passedOptions) {
    const options = {
      ...defaultOptions,
      ...passedOptions
    }

    return await store.set(key, value, options)
  }
}
