import {Prop, TypedModel} from '@orion-js/typed-model'
import serializeSchema from './serializeSchema'

it('should create a JSON of the schema', async () => {
  const schema = {
    name: {
      type: String
    }
  }
  const result = await serializeSchema(schema)
  expect(result).toEqual({name: {type: 'string', __graphQLType: 'String'}})
})

it('should pass field options', async () => {
  const schema = {
    name: {
      type: [String],
      label: '1234'
    }
  }
  const result = await serializeSchema(schema)
  expect(result.name).toEqual({
    type: ['string'],
    label: '1234',
    __graphQLType: '[String]'
  })
})

it('should serialize a typed model', async () => {
  @TypedModel()
  class Point {
    @Prop({label: 'Name'})
    name: string
  }

  const result = await serializeSchema(Point)
  expect(result.name).toEqual({
    type: 'string',
    label: 'Name',
    __graphQLType: 'String'
  })
})
