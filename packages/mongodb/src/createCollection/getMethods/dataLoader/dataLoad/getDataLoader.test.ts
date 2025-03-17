import {getDataLoader, cache} from './getDataLoader'
import DataLoader from 'dataloader'
import {it, expect} from 'vitest'

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
