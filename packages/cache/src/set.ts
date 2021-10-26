import {CacheStore, SetCacheOptions} from './CacheStoreType'

const defaultOptions = {
  ttl: 10000 // ten seconds
}

export default function (store: CacheStore) {
  return async function (key: string, value: any, passedOptions?: SetCacheOptions) {
    const options = {
      ...defaultOptions,
      ...passedOptions
    }

    return await store.set(key, value, options)
  }
}
