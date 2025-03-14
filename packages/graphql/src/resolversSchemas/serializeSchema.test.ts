import {Prop, TypedSchema} from '@orion-js/typed-model'
import serializeSchema from './serializeSchema'
import {it, expect} from 'vitest'

it('should create a JSON of the schema', async () => {
  const schema = {
    name: {
      type: String,
    },
  }
  const result = await serializeSchema(schema)
  expect(result).toEqual({name: {type: 'string', __graphQLType: 'String'}})
})

it('should pass field options', async () => {
  const schema = {
    name: {
      type: [String],
      label: '1234',
    },
  }
  const result = await serializeSchema(schema)
  console.log(result, 'result')
  expect(result.name).toEqual({
    type: ['string'],
    label: '1234',
    __graphQLType: '[String]',
  })
})

it('should serialize a typed model', async () => {
  @TypedSchema()
  class Point {
    @Prop({label: 'Name', type: String})
    name: string
  }

  const result = await serializeSchema(Point as any)
  expect(result.name).toEqual({
    type: 'string',
    label: 'Name',
    __graphQLType: 'String',
  })
})
