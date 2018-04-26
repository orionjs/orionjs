import getError from './index'
import Errors from '../../Errors'
import fieldType from '../../fieldType'

test('pass a simple string validation', async () => {
  const error = await getError({value: 'A valid string', currentSchema: {type: String}})
  expect(error).toBeNull()
})

test('detect required field when value is null', async () => {
  const error = await getError({value: null, currentSchema: {type: String}})
  expect(error).toBe(Errors.REQUIRED)
})

test('run custom validation if passed', async () => {
  const customType = fieldType({
    validate(value) {
      return 'hello'
    }
  })
  const error = await getError({
    value: 'A string',
    currentSchema: {type: customType}
  })
  expect(error).toBe('hello')
})

test('run async custom validation', async () => {
  const customType = fieldType({
    async validate(value) {
      const sleep = time => new Promise(resolve => setTimeout(resolve, time))
      await sleep(1)
      return 'hello'
    }
  })
  const error = await getError({
    value: 'A string',
    currentSchema: {type: customType}
  })
  expect(error).toBe('hello')
})
