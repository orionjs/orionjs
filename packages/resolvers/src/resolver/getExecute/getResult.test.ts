import {defaultCache} from '@orion-js/cache'
import {sleep} from '@orion-js/helpers'
import getResult from './getResult'

const cacheProvider = defaultCache

it('should execute the function', async () => {
  const resolve = async function ({num}: {num: number}) {
    return num * 2
  }

  const params = {num: 321}
  const result = await getResult({options: {resolve}, params, viewer: {}})

  expect(result).toBe(321 * 2)
})

it('should use the cache if passed', async () => {
  let index = 1

  const resolve = async function () {
    index++
    return index
  }

  const cache = 10
  const resolverId = '1234'
  const resolver = {
    resolve,
    cacheProvider,
    cache,
    resolverId
  }
  const emptyCall = {options: resolver, params: {}, viewer: {}}

  const result1 = await getResult(emptyCall)
  expect(result1).toBe(2)

  const result2 = await getResult(emptyCall)
  expect(result2).toBe(2)

  await sleep(15)

  const result3 = await getResult(emptyCall)
  expect(result3).toBe(3)
})

it('should use the custom cache Provider', async () => {
  const resolve = async function () {
    return 1
  }

  const provider = {
    async get() {
      return {value: 'fromcache'}
    },
    async set() {},
    async invalidate() {}
  }

  const cache = 10
  const resolverId = '1234'
  const resolver = {resolve, cacheProvider: provider, cache, resolverId}

  const result = await getResult({options: resolver, params: {}, viewer: {}})
  expect(result).toBe('fromcache')
})
