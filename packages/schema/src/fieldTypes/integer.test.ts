import Errors from '../Errors'
import integer from './integer'

test('return an error when the value is incorrect', async () => {
  //@ts-expect-error
  expect(integer.validate('1234')).toBe(Errors.NOT_AN_INTEGER)
  expect(integer.validate(12.24)).toBe(Errors.NOT_AN_INTEGER)
  expect(integer.validate(NaN)).toBe(Errors.NOT_AN_INTEGER)
  expect(integer.validate(Infinity)).toBe(Errors.NOT_AN_INTEGER)
})

test('return no error when the value is correct', async () => {
  expect(integer.validate(1e23)).toBeFalsy()
  expect(integer.validate(0)).toBeFalsy()
  expect(integer.validate(10 * 10)).toBeFalsy()
})
