import email from './email'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(email.validate(['Hello'])).toBe(Errors.NOT_A_STRING)
  expect(email.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_STRING)
  expect(email.validate(new Date())).toBe(Errors.NOT_A_STRING)
  expect(email.validate('astring')).toBe(Errors.NOT_AN_EMAIL)
  expect(email.validate(null)).toBe(Errors.REQUIRED)
  expect(email.validate('')).toBe(Errors.REQUIRED)
  expect(email.validate('', {currentSchema: {optional: true}})).toBeFalsy()
  expect(email.validate(null, {currentSchema: {optional: true}})).toBeFalsy()
})

test('return no error when the value is correct', async () => {
  expect(email.validate('aemail@email.com')).toBeFalsy()
})
