import {createCollection} from '../../index'
import {generateId} from '@orion-js/helpers'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {it, expect} from 'vitest'

it('should data load one not by id', async () => {
  @TypedSchema()
  class LoadOneTestModel {
    @Prop({type: String})
    _id: string

    @Prop({type: String})
    name: string

    @Prop({type: String})
    websiteId: string

    @Prop({type: Date, optional: true})
    deletedAt?: Date
  }

  const Tests = createCollection<LoadOneTestModel>({
    name: generateId(),
    schema: LoadOneTestModel,
  })

  const id1 = await Tests.insertOne({name: 'one', websiteId: '1', deletedAt: null})
  const id2 = await Tests.insertOne({name: 'two', websiteId: '1', deletedAt: null})
  const id3 = await Tests.insertOne({name: 'three', websiteId: '2', deletedAt: null})

  const [loaded1, loaded2, loaded3] = await Promise.all([
    Tests.loadOne({
      key: 'websiteId',
      value: '1',
      match: {deletedAt: null},
    }),
    Tests.loadOne({
      key: 'websiteId',
      value: '1',
      match: {deletedAt: null},
    }),
    Tests.loadOne({
      key: 'websiteId',
      value: '2',
      match: {deletedAt: null},
    }),
  ])
  expect([id1, id2]).toContain(loaded1._id)
  expect([id1, id2]).toContain(loaded2._id)
  expect(loaded3._id).toBe(id3)
})

it('handles undefined', async () => {
  const Tests = createCollection({name: generateId()})

  const result = await Tests.loadOne({
    key: 'websiteId',
    value: '1',
    match: {deletedAt: null},
  })

  expect(result).toBeUndefined()
})
