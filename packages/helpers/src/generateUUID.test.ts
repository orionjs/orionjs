import {generateUUID, generateUUIDWithPrefix} from './generateUUID'
import {it, expect} from 'vitest'

it('should generate random uuid v4', async () => {
  expect(generateUUID()).not.toBe(generateUUID())
  expect(generateUUID()).toBeTypeOf('string')
})

it('should generate uuid with prefix', async () => {
  expect(generateUUIDWithPrefix('test')).not.toBe(generateUUIDWithPrefix('test'))
  expect(generateUUIDWithPrefix('test')).toBeTypeOf('string')
})
