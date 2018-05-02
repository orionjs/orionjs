import email from './email'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(email.validate(['Hello'])).toBe(Errors.NOT_A_STRING)
  expect(email.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_STRING)
  expect(email.validate(new Date())).toBe(Errors.NOT_A_STRING)
  expect(email.validate('astring')).toBe(Errors.NOT_AN_EMAIL)
})

test('return no error when the value is correct', async () => {
  expect(email.validate('aemail@email.com')).toBeFalsy()
})
