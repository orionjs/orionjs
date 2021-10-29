import {asSchemaNode, Schema, SchemaNode, SchemaRecursiveNodeType, SchemaFieldTypes} from '..'
import dotGetSchema from './dotGetSchema'

const tag = {
  name: asSchemaNode<string>({
    type: String
  })
}
const car = {
  brand: asSchemaNode<string>({
    type: String
  }),
  tags: asSchemaNode<object[]>({
    type: [tag]
  })
}
const schema: Schema = {
  name: asSchemaNode<string>({
    type: String
  }),
  car: asSchemaNode<object>({
    type: car
  })
}

test('handle deep schemas', async () => {
  const value = dotGetSchema(schema, 'car.brand')
  expect(value).toBe(((schema.car as SchemaNode).type as SchemaRecursiveNodeType).brand)
})

test('throw error when no schema is passed', async () => {
  expect.assertions(1)
  try {
    dotGetSchema(null, 'car.brand')
  } catch (error) {
    expect(error.message).toBe('You need to pass a schema')
  }
})

test('handle invalid paths', async () => {
  const value = dotGetSchema(schema, 'car.brand.name')
  expect(value).toBeNull()
})

test('finds array first item when $ is passed', async () => {
  const value = dotGetSchema(schema, 'car.tags.$.name')
  expect(value).toBe(tag.name)
})

test('replaces numbers to $', async () => {
  expect(dotGetSchema(schema, 'car.tags.0.name')).toBe(tag.name)
  expect(dotGetSchema(schema, 'car.tags.1123.name')).toBe(tag.name)
})

test('returns information when is blackbox child', async () => {
  const schema = {
    services: asSchemaNode<object>({
      type: SchemaFieldTypes.Blackbox
    })
  }

  expect(dotGetSchema(schema, 'services')).toBe(schema.services)
  expect(dotGetSchema(schema, 'services').isBlackboxChild).toBeUndefined()
  expect(dotGetSchema(schema, 'services.phoneVerification').isBlackboxChild).toBe(true)
})
