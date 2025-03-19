import {describe, it, expect} from 'vitest'
import {createModel} from '@orion-js/models'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {getPaginatedResolverParams} from './params'
import {cleanAndValidate, schemaWithName} from '@orion-js/schema'

describe('Get params', () => {
  it('should return the params', () => {
    const params = getPaginatedResolverParams({
      params: {
        foo: {
          type: 'string',
        },
      },
    })

    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        optional: true,
        min: 1,
      },
      limit: {
        type: 'integer',
        defaultValue: 20,
        optional: true,
        min: 0,
        max: 200,
      },
      foo: {
        type: 'string',
      },
    })
  })

  it('should return the params with allowed sort', () => {
    const params = getPaginatedResolverParams({
      params: {
        foo: {
          type: 'string',
        },
      },
      allowedSorts: ['foo'],
    })
    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        optional: true,
        min: 1,
      },
      limit: {
        type: 'integer',
        defaultValue: 20,
        optional: true,
        min: 0,
        max: 200,
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true,
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true,
      },
      foo: {
        type: 'string',
      },
    })
  })

  it('should return the params correctly if we pass a model', () => {
    const model = schemaWithName('Params', {
      foo: {
        type: 'string',
      },
    })
    const params = getPaginatedResolverParams({
      params: model,
      allowedSorts: ['foo'],
    })

    expect(params).toEqual({
      __modelName: 'Params',
      page: {
        type: 'integer',
        defaultValue: 1,
        optional: true,
        min: 1,
      },
      limit: {
        type: 'integer',
        defaultValue: 20,
        optional: true,
        min: 0,
        max: 200,
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true,
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true,
      },
      foo: {
        type: 'string',
      },
    })
  })

  it('should return the params correctly if we pass a model (backwards)', () => {
    const model = createModel({
      name: 'Params',
      schema: {
        foo: {
          type: 'string',
        },
      },
    })
    const params = getPaginatedResolverParams({
      params: model as any,
      allowedSorts: ['foo'],
    })

    expect(params).toEqual({
      __modelName: 'Params',
      page: {
        type: 'integer',
        defaultValue: 1,
        optional: true,
        min: 1,
      },
      limit: {
        type: 'integer',
        defaultValue: 20,
        optional: true,
        min: 0,
        max: 200,
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true,
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true,
      },
      foo: {
        type: 'string',
      },
    })
  })

  it('should return the params correctly if we pass a typed schema', () => {
    @TypedSchema()
    class Schema {
      @Prop({type: String})
      foo: string
    }

    const params = getPaginatedResolverParams({
      params: Schema as any,
      allowedSorts: ['foo'],
    })

    expect(params).toEqual({
      __modelName: 'Schema',
      page: {
        type: 'integer',
        defaultValue: 1,
        optional: true,
        min: 1,
      },
      limit: {
        type: 'integer',
        defaultValue: 20,
        optional: true,
        min: 0,
        max: 200,
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true,
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true,
      },
      foo: {
        type: String,
      },
    })
  })

  it('should correctly apply the default sort', async () => {
    const params = getPaginatedResolverParams({
      params: {},
      allowedSorts: ['foo'],
      defaultSortBy: 'foo',
      defaultSortType: 'asc',
    })

    expect(params.sortBy).toEqual({
      type: String,
      allowedValues: ['foo'],
      optional: true,
      defaultValue: 'foo',
    })
    expect(params.sortType).toEqual({
      type: String,
      allowedValues: ['asc', 'desc'],
      optional: true,
      defaultValue: 'asc',
    })

    const cleaned = await cleanAndValidate(params, {})

    expect(cleaned).toEqual({
      limit: 20,
      page: 1,
      sortBy: 'foo',
      sortType: 'asc',
    })
  })
})
