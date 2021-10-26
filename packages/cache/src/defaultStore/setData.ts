import cloneDeep from 'lodash/cloneDeep'
import {SetCacheOptions} from '../CacheStoreType'

export default async function (key: string, value: any, options: SetCacheOptions) {
  const store = global.orionjsCache

  const stored = {
    expires: new Date().getTime() + options.ttl,
    value: cloneDeep(value)
  }

  store[key] = stored
}
