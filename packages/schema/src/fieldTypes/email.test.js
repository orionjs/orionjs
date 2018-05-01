import string from './string'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(string.validate(['Hello'])).toBe(Errors.NOT_A_STRING)
  expect(string.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_STRING)
  expect(string.validate(new Date())).toBe(Errors.NOT_A_STRING)
  expect(string.validate('astring')).toBe(Errors.NOT_AN_EMAIL)
})

test('return no error when the value is correct', async () => {
  expect(string.validate('aemail@email.com')).toBeFalsy()
})
