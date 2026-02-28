import Errors from '../Errors'
import ID from './ID'

test('return an error when the value is incorrect', async () => {
  //@ts-expect-error
  expect(ID.validate(false)).toBe(Errors.NOT_AN_ID)
  //@ts-expect-error
  expect(ID.validate(new Date())).toBe(Errors.NOT_AN_ID)
  //@ts-expect-error
  expect(ID.validate(NaN)).toBe(Errors.NOT_AN_ID)
  //@ts-expect-error
  expect(ID.validate(1.01)).toBe(Errors.NOT_AN_ID)
  //@ts-expect-error
  expect(ID.validate(Infinity)).toBe(Errors.NOT_AN_ID)
})

test('return no error when the value is correct', async () => {
  //@ts-expect-error
  expect(ID.clean(1234)).toBe('1234')
  expect(ID.validate('helloworld')).toBeFalsy()
  expect(ID.validate('123456')).toBeFalsy()
})
