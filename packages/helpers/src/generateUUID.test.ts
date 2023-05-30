import isString from 'lodash/isString'
import {generateUUID} from './generateUUID'

it('should generate random uuid v4', async () => {
  expect(generateUUID()).not.toBe(generateUUID())
  expect(isString(generateUUID())).toBe(true)
})
