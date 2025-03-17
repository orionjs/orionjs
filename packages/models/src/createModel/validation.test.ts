import createModel from './index'
import {createResolver} from '@orion-js/resolvers'
import {schemaWithName} from '@orion-js/schema'
import {it, expect} from 'vitest'

it('should validate a schema', async () => {
  const model = createModel({
    name: 'AModel',
    schema: {
      name: {
        type: String,
      },
    },
  })

  await model.validate({name: 'String'})
})

it('should allow deep model validation', async () => {
  const model2 = createModel({
    name: 'AModel',
    schema: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
    },
  })

  const model1 = createModel({
    name: 'AModel2',
    schema: {
      data: {
        type: model2,
      },
    },
  })

  await model1.validate({data: {firstName: 'Nicolás', lastName: 'López'}})

  expect.assertions(1)
  try {
    await model1.validate({})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('[regression test]: should allow correct doc cleaning for resolver params', async () => {
  const Point = schemaWithName('Point', {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  })

  const resolver1 = createResolver({
    params: {
      point: {
        type: Point,
      },
    },
    async resolve({point}) {
      return point
    },
  })

  const doc = await resolver1.resolve({point: {latitude: '11', longitude: '12'} as any})

  expect(doc).toEqual({latitude: 11, longitude: 12})
})
