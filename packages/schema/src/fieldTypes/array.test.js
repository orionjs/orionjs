import array from './array'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(array.validate('a string')).toBe(Errors.NOT_AN_ARRAY)
  expect(array.validate(new Date())).toBe(Errors.NOT_AN_ARRAY)
  expect(array.validate({anObject: true})).toBe(Errors.NOT_AN_ARRAY)
})

test('return no error when the value is correct', async () => {
  expect(array.validate(['hello'])).toBeFalsy()
  expect(array.validate([])).toBeFalsy()
})
