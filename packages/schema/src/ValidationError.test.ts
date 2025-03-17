import ValidationError from './ValidationError'
import Errors from './Errors'
import {test, expect} from 'vitest'

test("don't allow to create a ValidationError with no error", () => {
  expect(() => {
    // @ts-ignore
    new ValidationError()
  }).toThrow()
})

test('ValidationError is instance of Error', () => {
  const error = new ValidationError({name: Errors.REQUIRED})
  expect(error).toBeInstanceOf(Error)
})

test('message to be show error information', () => {
  const error = new ValidationError({name: Errors.REQUIRED})
  expect(error.message).toBe('Validation Error: {name: required}')
})

test('prepends keys', () => {
  const error = new ValidationError({name: Errors.REQUIRED})
  expect(error.prependKey('person').message).toBe('Validation Error: {person.name: required}')
})

test('getInfo to return error information in correct format', () => {
  const validationError = {name: Errors.REQUIRED}
  const error = new ValidationError(validationError)
  const info = {
    error: 'validationError',
    message: 'Validation Error',
    validationErrors: {name: Errors.REQUIRED},
  }
  expect(error.getInfo()).toEqual(info)
})
