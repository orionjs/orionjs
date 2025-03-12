import {Prop, TypedSchema} from '@orion-js/typed-model'
import getField from './getField'
import {describe, it, expect} from 'vitest'

describe('Field serialization', () => {
  it('should return a valid serialization of the field', async () => {
    const schema = {
      name: {
        type: String,
        a: '1234',
      },
    }
    const result = await getField(schema.name)
    expect(result).toEqual({type: 'string', a: '1234', __graphQLType: 'String'})
  })

  it('should pass field options with simple array fields', async () => {
    const schema = {
      name: {
        type: [String],
        a: '1234',
      },
    }
    const result = await getField(schema.name)
    expect(result.a).toEqual(schema.name.a)
  })

  it('Should allow serialization of typed models', async () => {
    @TypedSchema()
    class Point {
      @Prop({label: 'Name', type: String})
      name: string
    }

    const schema = {
      point: {
        type: Point,
      },
    }

    const result = await getField(schema.point)
    expect(result.type.name).toEqual({type: 'string', label: 'Name', __graphQLType: 'String'})
  })
})
