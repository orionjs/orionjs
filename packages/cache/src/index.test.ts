import cache from './index'
import sleep from '../helpers/sleep'
import garbageCollector from './store/garbageCollector'

afterAll(() => {
  garbageCollector(true)
})

it('should save data in local cache', async () => {
  await cache.set('key1', 'value1')
  const result = await cache.get('key1')
  expect(result.value).toBe('value1')
})

it('should return undefined values', async () => {
  await cache.set('key12', undefined)
  const result = await cache.get('key12')
  expect(result.value).toBeUndefined()
})

it('should return undefined when ttl is passed', async () => {
  await cache.set('key2', 'value2', {ttl: 1})
  await sleep(10)

  const result = await cache.get('key2')
  expect(result).toBeUndefined()
})

it('automatically delete garbage with garbageCollector', async () => {
  await cache.set('key3', 'value3', {ttl: 1})
  await sleep(310)
  const db = global.orionjsCache

  expect(db.key).toBeUndefined()
})

it('invalidate cache keys', async () => {
  await cache.set('key4', 'value', {ttl: 1000})
  const result = await cache.get('key4')
  expect(result.value).toBe('value')

  await cache.invalidate('key4')

  const result2 = await cache.get('key4')
  expect(result2).toBeUndefined()
  const db = global.orionjsCache
  expect(db.key4).toBeUndefined()
})
