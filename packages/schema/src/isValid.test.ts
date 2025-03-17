import isValid from './isValid'
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

test('returns true when object is valid', async () => {
  const result = await isValid(schema, validObject)
  expect(result).toBe(true)
})

test('returns false when object is invalid', async () => {
  const result = await isValid(schema, invalidObject)
  expect(result).toBe(false)
})
