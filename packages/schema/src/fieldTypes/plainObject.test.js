import plainObject from './plainObject'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(plainObject.validate('a string')).toBe(Errors.NOT_AN_OBJECT)
  expect(plainObject.validate(new Date())).toBe(Errors.NOT_AN_OBJECT)
  expect(plainObject.validate([])).toBe(Errors.NOT_AN_OBJECT)
})

test('return no error when the value is correct', async () => {
  expect(plainObject.validate({})).toBeFalsy()
  expect(plainObject.validate({name: 'Nicolás'})).toBeFalsy()
})

test('should return same value when cleaning non-object', async () => {
  expect(plainObject.clean('a string')).toBe('a string')
})

test('should filter keys not in schema', async () => {
  const schema = {
    yes: {
      type: String
    }
  }
  const value = {
    yes: 'yes',
    no: 'no'
  }
  expect(
    plainObject.clean(value, {
      type: schema,
      options: {filter: true}
    })
  ).toEqual({
    yes: 'yes'
  })

  expect(
    plainObject.clean(value, {
      type: schema,
      options: {filter: false}
    })
  ).toEqual(value)
})
