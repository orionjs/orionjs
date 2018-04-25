import ValidationError from './ValidationError'

test('ValidationError is instance of Error', () => {
  const error = new ValidationError()
  expect(error).toBeInstanceOf(Error)
})

test('message to be Validation error', () => {
  const error = new ValidationError()
  expect(error.message).toBe('Validation Error')
})

test('getInfo to return error information in correct format', () => {
  const validationError = {key: 'name', code: 'required'}
  const error = new ValidationError([validationError])
  const info = {
    error: 'validationError',
    message: 'Validation Error',
    validationErrors: {name: 'required'}
  }
  expect(error.getInfo()).toEqual(info)
})

test('allow creation of error passing array or single error', () => {
  const validationError = {key: 'name', code: 'required'}
  const errorArray = new ValidationError([validationError])
  const errorSingle = new ValidationError(validationError)
  expect(errorSingle.getInfo()).toEqual(errorArray.getInfo())
})
