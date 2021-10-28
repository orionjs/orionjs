import blackbox from './blackbox'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(blackbox.validate('a string')).toBe(Errors.NOT_AN_OBJECT)
  expect(blackbox.validate(new Date())).toBe(Errors.NOT_AN_OBJECT)
  expect(blackbox.validate([])).toBe(Errors.NOT_AN_OBJECT)
})

test('return no error when the value is correct', async () => {
  expect(blackbox.validate({name: null})).toBeFalsy()
  expect(blackbox.validate({name: 'Nicolás'})).toBeFalsy()
})
