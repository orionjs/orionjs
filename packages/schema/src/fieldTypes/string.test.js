import string from './string'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(string.validate(['Hello'])).toBe(Errors.NOT_A_STRING)
  expect(string.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_STRING)
  expect(string.validate(new Date())).toBe(Errors.NOT_A_STRING)
})

test('return no error when the value is correct', async () => {
  expect(string.validate('')).toBeFalsy()
  expect(string.validate('Nicolás')).toBeFalsy()
})

test('validate correctly min and max', async () => {
  const info = {currentSchema: {min: 3, max: 5}}
  expect(string.validate('hello', info)).toBeFalsy()
  expect(string.validate('hi', info)).toBe(Errors.STRING_TOO_SHORT)
  expect(string.validate('hello my friend', info)).toBe(Errors.STRING_TOO_LONG)
})

test('validate correctly allowed values', async () => {
  const info = {currentSchema: {allowedValues: ['hello']}}
  expect(string.validate('hello', info)).toBeFalsy()
  expect(string.validate('hi', info)).toBe(Errors.NOT_AN_ALLOWED_VALUE)
})
