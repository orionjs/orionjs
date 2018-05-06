import generateId from './generateId'
import isString from 'lodash/isString'

it('should generate random ids', async () => {
  expect(generateId()).not.toBe(generateId())
  expect(isString(generateId())).toBe(true)
})
