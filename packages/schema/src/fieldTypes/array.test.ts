import array from './array'
import Errors from '../Errors'
import {it, test, expect} from 'vitest'

it('should convert a single item into and array when cleaning', async () => {
  const options = {autoConvert: true}
  expect(array.clean('a string', {options})).toEqual(['a string'])
  expect(array.clean({anObject: true}, {options})).toEqual([{anObject: true}])
  expect(array.clean({anObject: true})).toEqual({anObject: true})
})

test('return an error when the value is incorrect', async () => {
  expect(array.validate('a string')).toBe(Errors.NOT_AN_ARRAY)
  expect(array.validate(new Date())).toBe(Errors.NOT_AN_ARRAY)
  expect(array.validate({anObject: true})).toBe(Errors.NOT_AN_ARRAY)
})

test('return no error when the value is correct', async () => {
  expect(array.validate(['hello'])).toBeFalsy()
  expect(array.validate([])).toBeFalsy()
})
