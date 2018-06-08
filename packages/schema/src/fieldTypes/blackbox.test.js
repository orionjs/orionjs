import plainObject from './plainObject'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(plainObject.validate('a string')).toBe(Errors.NOT_AN_OBJECT)
  expect(plainObject.validate(new Date())).toBe(Errors.NOT_AN_OBJECT)
  expect(plainObject.validate([])).toBe(Errors.NOT_AN_OBJECT)
})

test('return no error when the value is correct', async () => {
  expect(plainObject.validate({name: null})).toBeFalsy()
  expect(plainObject.validate({name: 'Nicolás'})).toBeFalsy()
})
