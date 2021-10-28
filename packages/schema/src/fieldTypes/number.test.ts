import number from './number'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  //@ts-ignore
  expect(number.validate('1234')).toBe(Errors.NOT_A_NUMBER)
  //@ts-ignore
  expect(number.validate(new Date())).toBe(Errors.NOT_A_NUMBER)
  //@ts-ignore
  expect(number.validate([123])).toBe(Errors.NOT_A_NUMBER)
  expect(number.validate(NaN)).toBe(Errors.NOT_A_NUMBER)
  expect(number.validate(Infinity)).toBe(Errors.NOT_A_NUMBER)
})

test('return no error when the value is correct', async () => {
  expect(number.validate(99999999999999999999999)).toBeFalsy()
  expect(number.validate(10 / 3)).toBeFalsy()
  expect(number.validate(10 * 10)).toBeFalsy()
})

test('validate correctly min and max', async () => {
  const info = {currentSchema: {min: 0, max: 10}}
  expect(number.validate(10, info)).toBeFalsy()
  expect(number.validate(-10, info)).toBe(Errors.NUMBER_TOO_SMALL)
  expect(number.validate(10.1, info)).toBe(Errors.NUMBER_TOO_BIG)
})
