import {Schema, SchemaNode, SchemaRecursiveNodeType} from '..'
import dotGetSchema from './dotGetSchema'

const tag = {
  name: {
    type: String
  }
}
const car = {
  brand: {
    type: String
  },
  tags: {
    type: [tag]
  }
}
const schema: Schema = {
  name: {
    type: String
  },
  car: {
    type: car
  }
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
    services: {
      type: 'blackbox'
    }
  }

  expect(dotGetSchema(schema, 'services')).toBe(schema.services)
  expect(dotGetSchema(schema, 'services').isBlackboxChild).toBeUndefined()
  expect(dotGetSchema(schema, 'services.phoneVerification').isBlackboxChild).toBe(true)

  const schema2: Schema = {
    services: {
      type: 'blackbox'
    }
  }

  expect(dotGetSchema(schema2, 'services')).toBe(schema2.services)
  expect(dotGetSchema(schema2, 'services').isBlackboxChild).toBeUndefined()
  expect(dotGetSchema(schema2, 'services.phoneVerification').isBlackboxChild).toBe(true)
})
