import isString from 'lodash/isString'
import { generateUUID, generateUUIDWithPrefix } from './generateUUID'

it('should generate random uuid v4', async () => {
  expect(generateUUID()).not.toBe(generateUUID())
  expect(isString(generateUUID())).toBe(true)
})

it('should generate uuid with prefix', async () => {
  expect(generateUUIDWithPrefix('test')).not.toBe(generateUUIDWithPrefix('test'))
  expect(isString(generateUUIDWithPrefix('test'))).toBe(true)
})
