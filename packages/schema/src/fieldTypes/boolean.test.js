import boolean from './boolean'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(boolean.validate(['Hello'])).toBe(Errors.NOT_A_BOOLEAN)
  expect(boolean.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_BOOLEAN)
  expect(boolean.validate(new Date())).toBe(Errors.NOT_A_BOOLEAN)
  expect(boolean.validate(1)).toBe(Errors.NOT_A_BOOLEAN)
  expect(boolean.validate(true)).toBeFalsy()
  expect(boolean.validate(false)).toBeFalsy()
})

test('autoconvert', async () => {
  const info = {options: {autoConvert: true}}
  expect(boolean.clean('hello', info)).toBe('hello')
  expect(boolean.clean('true', info)).toBe(true)
  expect(boolean.clean('false', info)).toBe(false)
  expect(boolean.clean(1, info)).toBe(true)
  expect(boolean.clean(0, info)).toBe(false)
  expect(boolean.clean(true, info)).toBe(true)
  expect(boolean.clean(false, info)).toBe(false)
  // dont autoconvert
  expect(boolean.clean('false')).toBe('false')
})
