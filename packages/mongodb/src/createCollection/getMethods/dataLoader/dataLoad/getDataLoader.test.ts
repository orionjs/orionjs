import DataLoader from 'dataloader'
import {expect, it} from 'vitest'
import {cache, getDataLoader} from './getDataLoader'

it('should get data loaders', async () => {
  const dataLoader = getDataLoader({
    key: 'test1',
    func: async () => {},
    timeout: 1,
  })

  expect(dataLoader).toBeInstanceOf(DataLoader)
})

it('should return same dataloader with same key', async () => {
  const options = {
    key: 'test1',
    func: async () => {},
    timeout: 1,
  }

  const dataLoader1 = getDataLoader(options)
  const dataLoader2 = getDataLoader(options)

  expect(dataLoader1).toBe(dataLoader2)
})

it('should delete dataloader map when its used', async () => {
  const func = async keys => keys

  const dataLoader = getDataLoader({
    key: 'test2',
    func,
    timeout: 10,
  })
  expect(cache.get('test2')).toBeInstanceOf(DataLoader)

  const result = await dataLoader.load(1)
  expect(result).toBe(1)

  expect(cache.get('test2')).toBeUndefined()
})

it('should cleanup stale dataloader map when its never used', async () => {
  getDataLoader({
    key: 'test-stale',
    func: async () => [],
    timeout: 1,
  })

  expect(cache.get('test-stale')).toBeInstanceOf(DataLoader)

  await new Promise(resolve => setTimeout(resolve, 120))

  expect(cache.get('test-stale')).toBeUndefined()
})
