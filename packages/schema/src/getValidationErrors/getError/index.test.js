import getError from './index'

test('pass a simple string validation', async () => {
  const error = await getError({value: 'A valid string', currentSchema: {type: String}})
  expect(error).toBeNull()
})

test('detect required field when value is null', async () => {
  const error = await getError({value: null, currentSchema: {type: String}})
  expect(error).toBe('required')
})

test('run custom validation if passed', async () => {
  const error = await getError({
    value: 'A string',
    currentSchema: {type: String, custom: () => 'hello'}
  })
  expect(error).toBe('hello')
})

test('run custom validation and pass', async () => {
  const error = await getError({
    value: 'A valid string',
    currentSchema: {type: String, custom: () => null}
  })
  expect(error).toBeNull()
})

test('detect unkown field type', async () => {
  const error = await getError({
    value: 'A string',
    currentSchema: {type: 'an unkown field type'}
  })
  expect(error).toBe('unknownFieldType')
})
