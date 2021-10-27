import cloneDeep from 'lodash/cloneDeep'
import {SetCacheOptions} from '../CacheStoreType'
import invalidateData from './invalidateData'

export default async function (key: string, value: any, options: SetCacheOptions) {
  const store = global.orionjsCache

  const stored = {
    expires: new Date().getTime() + options.ttl,
    value: cloneDeep(value),
    timeout: setTimeout(() => {
      invalidateData(key)
    }, options.ttl)
  }

  store[key] = stored
}
