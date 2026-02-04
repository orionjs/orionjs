import {expect, expectTypeOf, test} from 'vitest'
import {clean, getValidationErrors, isSchemaLike, validate} from '..'
import {InferSchemaType} from '.'

test('isSchemaLike should correctly identify schema with "type" field', () => {
  const schemaWithTypeField = {
    type: {
      type: String,
    },
    name: {
      type: String,
    },
  }

  expect(isSchemaLike(schemaWithTypeField)).toBe(true)
})

test('isSchemaLike should not identify a field definition as a schema', () => {
  const fieldDefinition = {
    type: String,
    optional: true,
  }

  // This should NOT be a schema, it's a field definition
  expect(isSchemaLike(fieldDefinition)).toBe(false)
})

test('isSchemaLike should not identify a field definition with nested schema as a schema', () => {
  const nestedSchema = {
    name: {
      type: String,
    },
  }

  const fieldDefinition = {
    type: nestedSchema,
    optional: true,
  }

  // This is a FIELD DEFINITION, not a schema itself
  // The nested schema is the TYPE of this field
  expect(isSchemaLike(fieldDefinition)).toBe(false)
})

test('EDGE CASE: field definition with nested schema that has "type" field', () => {
  const nestedSchemaWithTypeField = {
    type: {
      type: String,
    },
    value: {
      type: Number,
    },
  }

  const fieldDefinition = {
    type: nestedSchemaWithTypeField,
    optional: true,
  }

  // This is the problematic case!
  // fieldDefinition is a FIELD DEFINITION, not a schema
  // But the nested schema has a 'type' field, which confuses isSchemaLike
  // Current behavior: returns true (WRONG)
  // Expected behavior: should return false
  expect(isSchemaLike(fieldDefinition)).toBe(false)
})

test('schema with only "type" field should work correctly', async () => {
  const schemaWithOnlyType = {
    type: {
      type: String,
    },
  }

  const doc = {type: 'my-type'}
  const cleaned = await clean(schemaWithOnlyType, doc)
  expect(cleaned).toEqual({type: 'my-type'})

  const errors = await validate(schemaWithOnlyType, doc)
  expect(errors).toBeUndefined()
})

test('validation should work for schema with "type" field', async () => {
  const schemaWithTypeField = {
    type: {
      type: String,
    },
    name: {
      type: String,
    },
  }

  // Missing required field - cast to any to test runtime validation
  const errors = await getValidationErrors(schemaWithTypeField, {type: 'test'} as any)
  expect(errors).toBeDefined()
  expect(errors.name).toBeDefined()
})

test('schema with field named "type" should work correctly at runtime', async () => {
  const schemaWithTypeField = {
    type: {
      type: String,
    },
    name: {
      type: String,
    },
  } as const

  const doc = {
    type: 'my-type',
    name: 'test',
  }

  const cleaned = await clean(schemaWithTypeField, doc)
  expect(cleaned).toEqual({type: 'my-type', name: 'test'})

  const errors = await validate(schemaWithTypeField, doc)
  expect(errors).toBeUndefined()
})

test('nested schema with field named "type" should work correctly at runtime', async () => {
  const subSchemaWithType = {
    type: {
      type: String,
    },
    value: {
      type: Number,
    },
  }

  const parentSchema = {
    data: {
      type: subSchemaWithType,
    },
  }

  const doc = {
    data: {
      type: 'some-type',
      value: 123,
    },
  }

  const cleaned = await clean(parentSchema, doc)
  expect(cleaned).toEqual({data: {type: 'some-type', value: 123}})

  const errors = await validate(parentSchema, doc)
  expect(errors).toBeUndefined()
})

test('InferSchemaType should correctly infer type for schema with "type" field', () => {
  const schemaWithTypeField = {
    type: {
      type: String,
    },
    name: {
      type: String,
    },
  } as const

  type TestType = InferSchemaType<typeof schemaWithTypeField>

  // This should compile and the type should have both 'type' and 'name' as string fields
  const validObj: TestType = {
    type: 'my-type',
    name: 'test',
  }

  expectTypeOf(validObj.type).toEqualTypeOf<string>()
  expectTypeOf(validObj.name).toEqualTypeOf<string>()
})

test('InferSchemaType should correctly infer nested schema with "type" field', () => {
  const subSchemaWithType = {
    type: {
      type: String,
    },
    value: {
      type: Number,
    },
  } as const

  const parentSchema = {
    data: {
      type: subSchemaWithType,
    },
  } as const

  type TestType = InferSchemaType<typeof parentSchema>

  // This should compile and the type should have data.type as string and data.value as number
  const validObj: TestType = {
    data: {
      type: 'some-type',
      value: 123,
    },
  }

  expectTypeOf(validObj.data.type).toEqualTypeOf<string>()
  expectTypeOf(validObj.data.value).toEqualTypeOf<number>()
})
