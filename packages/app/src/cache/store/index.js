import setData from './setData'
import getData from './getData'
import garbageCollector from './garbageCollector'
import invalidateData from './invalidateData'

global.orionjsCache = {}

garbageCollector()

export default {
  set: setData,
  get: getData,
  invalidate: invalidateData
}
