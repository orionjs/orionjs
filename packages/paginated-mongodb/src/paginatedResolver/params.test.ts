import {createModel} from '@orion-js/models'
import getParams from './params'
import {TypedSchema, Prop} from '@orion-js/typed-model'

describe('Get params', () => {
  it('should return the params', () => {
    const params = getParams({
      params: {foo: 'bar'}
    })
    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        min: 1
      },
      limit: {
        type: 'integer',
        defaultValue: 0,
        min: 0,
        max: 200
      },
      foo: 'bar'
    })
  })

  it('should return the params with allowed sort', () => {
    const params = getParams({
      params: {foo: 'bar'},
      allowedSorts: ['foo']
    })
    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        min: 1
      },
      limit: {
        type: 'integer',
        defaultValue: 0,
        min: 0,
        max: 200
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true
      },
      foo: 'bar'
    })
  })

  it('should return the params correctly if we pass a model', () => {
    const model = createModel({
      name: 'Params',
      schema: {
        foo: {
          type: 'string'
        }
      }
    })
    const params = getParams({
      params: model,
      allowedSorts: ['foo']
    })

    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        min: 1
      },
      limit: {
        type: 'integer',
        defaultValue: 0,
        min: 0,
        max: 200
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true
      },
      foo: {
        type: 'string'
      }
    })
  })

  it('should return the params correctly if we pass a typed schema', () => {
    @TypedSchema()
    class Schema {
      @Prop()
      foo: string
    }

    const params = getParams({
      params: Schema,
      allowedSorts: ['foo']
    })

    expect(params).toEqual({
      page: {
        type: 'integer',
        defaultValue: 1,
        min: 1
      },
      limit: {
        type: 'integer',
        defaultValue: 0,
        min: 0,
        max: 200
      },
      sortBy: {
        type: String,
        allowedValues: ['foo'],
        optional: true
      },
      sortType: {
        type: String,
        allowedValues: ['asc', 'desc'],
        optional: true
      },
      foo: {
        type: String
      }
    })
  })
})
