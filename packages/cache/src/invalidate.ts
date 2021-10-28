import {CacheStore} from './CacheStoreType'

export default function (store: CacheStore) {
  return async function (key: string) {
    return await store.invalidate(key)
  }
}
