import setData from './setData'
import getData from './getData'
import invalidateData from './invalidateData'
import {CacheStore} from '../CacheStoreType'

global.orionjsCache = {}

const defaultCacheStore: CacheStore = {
  set: setData,
  get: getData,
  invalidate: invalidateData
}

export default defaultCacheStore
