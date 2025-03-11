import generateId from './generateId'
import {describe, it, expect} from 'vitest'

it('should generate random ids', async () => {
  expect(generateId()).not.toBe(generateId())
  expect(generateId()).toBeTypeOf('string')
})
