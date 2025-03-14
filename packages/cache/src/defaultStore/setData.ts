import {isType} from 'rambdax'
import {clone} from '@orion-js/helpers'
import {SetCacheOptions} from '../CacheStoreType'
import invalidateData from './invalidateData'

export default async function (key: string, value: any, options: SetCacheOptions) {
  const store = global.orionjsCache

  const stored = {
    expires: new Date().getTime() + options.ttl,
    value: isType('Object', value) ? clone(value) : value,
    timeout: setTimeout(() => {
      invalidateData(key)
    }, options.ttl),
  }

  store[key] = stored
}
