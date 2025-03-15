import validate from './validate'
import {test, expect} from 'vitest'

const schema = {
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
    optional: true,
  },
}

const validObject = {firstName: 'Nicolás', lastName: 'López'}
const invalidObject = {lastName: 'López'}

test("doesn't throw any error when object is valid", async () => {
  await validate(schema, validObject)
})

test('throws validation error when object is invalid', async () => {
  expect.assertions(1)
  try {
    await validate(schema, invalidObject)
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

test('passes on empty schemas', async () => {
  const errors = await validate({}, {})
  console.log('errors', errors)
  expect(errors).toBeUndefined()
})
