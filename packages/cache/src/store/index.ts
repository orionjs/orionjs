import setData from './setData'
import getData from './getData'
import garbageCollector from './garbageCollector'
import invalidateData from './invalidateData'
import {CacheStore} from '../CacheStoreType'

global.orionjsCache = {}

garbageCollector()

const defaultCacheStore: CacheStore = {
  set: setData,
  get: getData,
  invalidate: invalidateData
}

export default defaultCacheStore
