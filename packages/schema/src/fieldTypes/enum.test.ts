import createEnum from './enum'
import Errors from '../Errors'
import {Schema} from '../types'
import getValidationErrors from '../getValidationErrors'

test('return an error when the value is incorrect', async () => {
  expect(createEnum('hello', ['hello']).validate(['Hello'])).toBe(Errors.NOT_A_STRING)
  expect(createEnum('hello', ['hello']).validate({name: 'Nicolás'})).toBe(Errors.NOT_A_STRING)
  expect(createEnum('hello', ['hello']).validate(new Date())).toBe(Errors.NOT_A_STRING)
})

test('enum typescript helpers', async () => {
  const myEnum = createEnum('HelloEnum', ['hello', 'hi'] as const)
  const string: typeof myEnum.type = 'hello'
})

test('return no error when the value is correct', async () => {
  const info = {currentSchema: {optional: true}}
  expect(createEnum('hello', ['hello']).validate('', info)).toBe(Errors.NOT_AN_ALLOWED_VALUE)
  expect(createEnum('hello', ['hello']).validate('hello')).toBeFalsy()
})

test('validate correctly allowed values', async () => {
  expect(createEnum('hello', ['hello']).validate('hello')).toBeFalsy()
  expect(createEnum('hello', ['hello']).validate('hi')).toBe(Errors.NOT_AN_ALLOWED_VALUE)
})

test('Full schema with enum', async () => {
  const schema: Schema = {
    color: {
      type: createEnum('colors', ['red', 'blue', 'green'])
    }
  }

  expect(
    await getValidationErrors(schema, {
      color: 'red'
    })
  ).toBeNull()

  expect(
    await getValidationErrors(schema, {
      color: 'yellow'
    })
  ).toEqual({
    color: Errors.NOT_AN_ALLOWED_VALUE
  })
})
