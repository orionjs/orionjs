import date from './date'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(date.validate(['Hello'])).toBe(Errors.NOT_A_DATE)
  expect(date.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_DATE)
  expect(date.validate('A real string')).toBe(Errors.NOT_A_DATE)
  expect(date.validate(1234)).toBe(Errors.NOT_A_DATE)
})

test('return no error when the value is correct', async () => {
  expect(date.validate(new Date())).toBeFalsy()
})
