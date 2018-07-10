import cloneDeep from 'lodash/cloneDeep'

export default async function(key, value, options) {
  const store = global.orionjsCache

  const stored = {
    expires: new Date().getTime() + options.ttl,
    value: cloneDeep(value)
  }

  store[key] = stored
}
