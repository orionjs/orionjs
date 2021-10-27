import set from './set'
import get from './get'
import invalidate from './invalidate'
import {CacheStore, OrionCache} from './CacheStoreType'
import defaultStore from './defaultStore'

export const createCache = (store: CacheStore): OrionCache => {
  return {
    set: set(store),
    get: get(store),
    invalidate: invalidate(store)
  }
}

const defaultCache = createCache(defaultStore)

export {defaultStore, defaultCache, CacheStore, OrionCache}
