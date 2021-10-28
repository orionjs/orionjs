import range from 'lodash/range'
import random from 'lodash/random'
import sortBy from 'lodash/sortBy'
import {generateId} from '@orion-js/helpers'
import createCollection from '../../index'

it('should data load many not by id', async () => {
  const Tests = createCollection({name: generateId()})

  const id1 = await Tests.insertOne({name: 'one', websiteId: '1', deletedAt: null})
  const id2 = await Tests.insertOne({name: 'two', websiteId: '1', deletedAt: null})
  const id3 = await Tests.insertOne({name: 'three', websiteId: '2', deletedAt: null})

  const result = await Promise.all([
    Tests.loadMany({
      key: 'websiteId',
      value: '1',
      match: {deletedAt: null}
    }),
    Tests.loadMany({
      key: 'websiteId',
      value: '2',
      match: {deletedAt: null}
    })
  ])

  const [[loaded1, loaded2], [loaded3]] = result

  expect([id1, id2]).toContain(loaded1._id)
  expect([id1, id2]).toContain(loaded2._id)
  expect(loaded3._id).toBe(id3)
})

it('should load many on many', async () => {
  const Tests = createCollection({name: generateId()})

  await Tests.insertOne({websiteId: 1, deletedAt: null})
  await Tests.insertOne({websiteId: 2, deletedAt: null})
  await Tests.insertOne({websiteId: 3, deletedAt: null})

  const [result1, result2] = await Promise.all([
    Tests.loadMany({
      key: 'websiteId',
      values: [1, 2],
      sort: {websiteId: 1}
    }),
    Tests.loadMany({
      key: 'websiteId',
      values: [2, 3],
      sort: {websiteId: 1}
    })
  ])

  const values1 = result1.map(r => r.websiteId)
  const values2 = result2.map(r => r.websiteId)

  expect(values1).toEqual([1, 2])
  expect(values2).toEqual([2, 3])
})

it('should load sorted data', async () => {
  const Tests = createCollection({name: generateId()})

  for (const _ of range(100)) {
    await Tests.insertOne({index: random(100), websiteId: '1'})
    await Tests.insertOne({index: random(100), websiteId: '2'})
    await Tests.insertOne({index: random(100), websiteId: '3'})
  }
  const [results1, results2, results3] = await Promise.all([
    Tests.loadMany({
      key: 'websiteId',
      value: '1',
      sort: {index: 1}
    }),
    Tests.loadMany({
      key: 'websiteId',
      value: '2',
      sort: {index: 1}
    }),
    Tests.loadMany({
      key: 'websiteId',
      value: '3',
      sort: {index: 1}
    })
  ])

  const indexes1 = results1.map(result => result.index)
  const indexes2 = results2.map(result => result.index)
  const indexes3 = results3.map(result => result.index)

  expect(indexes1).toEqual(sortBy(indexes1))
  expect(indexes2).toEqual(sortBy(indexes2))
  expect(indexes3).toEqual(sortBy(indexes3))
})
