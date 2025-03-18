import {cloneSchema} from './cloneSchema'
import {test, expect} from 'vitest'
import {Schema} from './types'

// Sample schema for testing
const userSchema = {
  firstName: {
    type: String,
    min: 2,
  },
  lastName: {
    type: String,
    optional: true,
  },
  age: {
    type: Number,
    min: 0,
  },
  email: {
    type: String,
    validate: (val: string) => {
      if (!val.includes('@')) return 'Invalid email format'
    },
  },
  address: {
    type: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      country: {
        type: String,
        defaultValue: 'Unknown',
      },
    },
  },
} satisfies Schema

test('clones a schema without modifications', () => {
  const cloned = cloneSchema({schema: userSchema})
  expect(cloned).toEqual(userSchema)
  // Ensure it's a different object reference
  expect(cloned).not.toBe(userSchema)
})

test('extends a schema with new fields', () => {
  const extensionSchema = {
    username: {
      type: String,
      min: 3,
    },
    isActive: {
      type: Boolean,
      defaultValue: true,
    },
  }

  const cloned = cloneSchema({
    schema: userSchema,
    extendSchema: extensionSchema,
  })

  // Original fields should be preserved
  expect(cloned.firstName).toEqual(userSchema.firstName)
  expect(cloned.lastName).toEqual(userSchema.lastName)
  expect(cloned.age).toEqual(userSchema.age)
  expect(cloned.email).toEqual(userSchema.email)

  // New fields should be added
  expect(cloned.username).toEqual(extensionSchema.username)
  expect(cloned.isActive).toEqual(extensionSchema.isActive)
})

test('overrides fields when extending', () => {
  const extensionSchema = {
    // Override firstName with new definition
    firstName: {
      type: String,
      min: 5, // Different min value
      label: 'First Name',
    },
  }

  const cloned = cloneSchema({
    schema: userSchema,
    extendSchema: extensionSchema,
  })

  // Original field should be overridden
  expect(cloned.firstName).toEqual(extensionSchema.firstName)
  expect(cloned.firstName).not.toEqual(userSchema.firstName)

  // Other fields remain the same
  expect(cloned.lastName).toEqual(userSchema.lastName)
})

test('picks specific fields only', () => {
  const cloned = cloneSchema({
    schema: userSchema,
    pickFields: ['firstName', 'email'],
  })

  // Should only contain picked fields
  expect(Object.keys(cloned)).toHaveLength(2)
  expect(cloned.firstName).toEqual(userSchema.firstName)
  expect(cloned.email).toEqual(userSchema.email)
  // @ts-expect-error
  expect(cloned.lastName).toBeUndefined()
  // @ts-expect-error
  expect(cloned.age).toBeUndefined()
  // @ts-expect-error
  expect(cloned.address).toBeUndefined()
})

test('omits specific fields', () => {
  const cloned = cloneSchema({
    schema: userSchema,
    omitFields: ['lastName', 'address'],
  })

  // Should omit specified fields
  expect(Object.keys(cloned)).toHaveLength(3)
  expect(cloned.firstName).toEqual(userSchema.firstName)
  expect(cloned.age).toEqual(userSchema.age)
  expect(cloned.email).toEqual(userSchema.email)

  // @ts-expect-error
  expect(cloned.lastName).toBeUndefined()
  // @ts-expect-error
  expect(cloned.address).toBeUndefined()
})

test('maps field definitions', () => {
  const cloned = cloneSchema({
    schema: userSchema,
    mapFields: field => {
      if (field.type === String) {
        return {
          ...field,
          optional: true, // Add a new property to all string fields
        }
      }
      return field
    },
  })

  // String fields should have trim: true
  // @ts-expect-error
  expect(cloned.firstName.optional).toBe(true)
  expect(cloned.lastName.optional).toBe(true)
  // @ts-expect-error
  expect(cloned.email.optional).toBe(true)

  // Non-string fields should remain unchanged
  // @ts-expect-error
  expect(cloned.age.optional).toBeUndefined()
})

test('combines pick, omit, and extend operations', () => {
  const extensionSchema = {
    isVerified: {
      type: Boolean,
      defaultValue: false,
    },
  }

  const cloned = cloneSchema({
    schema: userSchema,
    pickFields: ['firstName', 'email'],
    extendSchema: extensionSchema,
  })

  // Should only contain picked fields plus extension
  expect(Object.keys(cloned)).toHaveLength(3)
  expect(cloned.firstName).toEqual(userSchema.firstName)
  expect(cloned.email).toEqual(userSchema.email)
  expect(cloned.isVerified).toEqual(extensionSchema.isVerified)
  // @ts-expect-error
  expect(cloned.lastName).toBeUndefined()
  // @ts-expect-error
  expect(cloned.age).toBeUndefined()
})

test('maintains reference equality for nested schemas', () => {
  const nestedSchema = {
    profile: {
      type: {
        bio: {
          type: String,
        },
        interests: {
          type: [String],
        },
      },
    },
  }

  const cloned = cloneSchema({schema: nestedSchema})

  // Should maintain nested structure
  expect(cloned.profile.type).toEqual(nestedSchema.profile.type)
})

test('combines mapFields with extensions', () => {
  const extensionSchema = {
    role: {
      type: String,
      defaultValue: 'user',
    },
  }

  const cloned = cloneSchema({
    schema: userSchema,
    extendSchema: extensionSchema,
    mapFields: (field, key) => {
      return {
        ...field,
        fieldType: key,
      }
    },
  })

  // All fields should have key property
  Object.keys(userSchema).map(key => {
    expect(cloned[key].fieldType).toBe(key)
  })

  // Extension field should also have key property
  expect((cloned.role as any).fieldType).toBe('role')
})

test('empty schema returns empty result', () => {
  const emptySchema = {}
  const cloned = cloneSchema({schema: emptySchema})

  expect(cloned).toEqual({})
  expect(Object.keys(cloned)).toHaveLength(0)
})
