import {getDataLoader, cache} from './getDataLoader'

import DataLoader from 'dataloader'

it('should get data loaders', async () => {
  const dataLoader = getDataLoader('test1', () => {})

  expect(dataLoader).toBeInstanceOf(DataLoader)
})

it('should return same dataloader with same key', async () => {
  const dataLoader1 = getDataLoader('test1', () => {})
  const dataLoader2 = getDataLoader('test1', () => {})

  expect(dataLoader1).toBe(dataLoader2)
})

it('should delete dataloader map when its used', async () => {
  const func = keys => keys

  const dataLoader = getDataLoader('test2', func)
  expect(cache.get(JSON.stringify('test2'))).toBeInstanceOf(DataLoader)

  const result = await dataLoader.load(1)
  expect(result).toBe(1)

  expect(cache.get(JSON.stringify('test2'))).toBeUndefined()
})
