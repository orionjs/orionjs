import getFieldValidator from './getFieldValidator'

test('returns object validator when an object is passed', async () => {
  const validator = await getFieldValidator({name: {type: String}})
  expect(validator).toBe('plainObject')
})

test('returns array validator when an array is passed', async () => {
  const validator = await getFieldValidator([String])
  expect(validator).toBe('array')
})

test('returns string validator when String is passed', async () => {
  const validator = await getFieldValidator(String)
  expect(validator).toBe('string')
})

test('returns number validator when Number is passed', async () => {
  const validator = await getFieldValidator(Number)
  expect(validator).toBe('number')
})

test('returns date validator when Date is passed', async () => {
  const validator = await getFieldValidator(Date)
  expect(validator).toBe('date')
})

test('returns string validator when a string key is passed', async () => {
  const validator = await getFieldValidator('string')
  expect(validator).toBe('string')
})

test('returns integer validator when a integer key is passed', async () => {
  const validator = await getFieldValidator('integer')
  expect(validator).toBe('integer')
})

test('returns unkown field validator when an unkown type is passed', async () => {
  expect.assertions(1)
  try {
    await getFieldValidator(() => {})
  } catch (error) {
    expect(error.message).toBe('Field type is invalid. Pass a string or a custom field type')
  }
})

test('returns unkown field validator when an unkown type is passed', async () => {
  expect.assertions(1)
  try {
    await getFieldValidator('an unknown type')
  } catch (error) {
    expect(error.message).toBe('Field type does not exist')
  }
})
