import ValidationError from './ValidationError'
import Errors from './Errors'

test("don't allow to create a ValidationError with no error", () => {
  expect(() => {
    // eslint-disable-next-line
    new ValidationError()
  }).toThrow()
})

test('ValidationError is instance of Error', () => {
  const error = new ValidationError({name: Errors.REQUIRED})
  expect(error).toBeInstanceOf(Error)
})

test('message to be Validation error', () => {
  const error = new ValidationError({name: Errors.REQUIRED})
  expect(error.message).toBe('Validation Error')
})

test('getInfo to return error information in correct format', () => {
  const validationError = {name: Errors.REQUIRED}
  const error = new ValidationError(validationError)
  const info = {
    error: 'validationError',
    message: 'Validation Error',
    validationErrors: {name: Errors.REQUIRED}
  }
  expect(error.getInfo()).toEqual(info)
})
