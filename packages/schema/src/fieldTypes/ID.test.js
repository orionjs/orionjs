import ID from './ID'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(ID.validate(false)).toBe(Errors.NOT_AN_ID)
  expect(ID.validate(new Date())).toBe(Errors.NOT_AN_ID)
  expect(ID.validate(NaN)).toBe(Errors.NOT_AN_ID)
  expect(ID.validate(1.01)).toBe(Errors.NOT_AN_ID)
  expect(ID.validate(Infinity)).toBe(Errors.NOT_AN_ID)
})

test('return no error when the value is correct', async () => {
  expect(ID.clean(1234)).toBe('1234')
  expect(ID.validate('helloworld')).toBeFalsy()
  expect(ID.validate('123456')).toBeFalsy()
})
