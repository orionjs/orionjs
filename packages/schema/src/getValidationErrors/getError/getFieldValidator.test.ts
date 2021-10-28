import getFieldValidator from './getFieldValidator'
import fieldType from '../../fieldType'
import getFieldType from './getFieldType'

test('returns object validator when an object is passed', async () => {
  const validator = getFieldValidator({name: {type: String}})
  expect(validator).toBe('plainObject')
})

test('returns array validator when an array is passed', async () => {
  const validator = getFieldValidator([String])
  expect(validator).toBe('array')
})

test('returns string validator when String is passed', async () => {
  const validator = getFieldValidator(String)
  expect(validator).toBe('string')
})

test('returns number validator when Number is passed', async () => {
  const validator = getFieldValidator(Number)
  expect(validator).toBe('number')
})

test('returns date validator when Date is passed', async () => {
  const validator = getFieldValidator(Date)
  expect(validator).toBe('date')
})

test('returns string validator when a string key is passed', async () => {
  const validator = getFieldValidator('string')
  expect(validator).toBe('string')
})

test('returns integer validator when a integer key is passed', async () => {
  const validator = getFieldValidator('integer')
  expect(validator).toBe('integer')
})

test('get custom field type validator', async () => {
  const aFieldType = fieldType({
    name: 'customFieldType'
  })

  const result = getFieldType(aFieldType)
  expect(result).toBe(aFieldType)
})

test('returns unkown field validator when an unkown type function is passed', async () => {
  expect.assertions(1)
  try {
    getFieldValidator(() => {})
  } catch (error) {
    expect(error.message).toMatch(/Field type is invalid/)
  }
})

test('returns unkown field validator when an unkown type string is passed', async () => {
  expect.assertions(1)
  try {
    getFieldValidator('an unknown type')
  } catch (error) {
    expect(error.message).toMatch(/Field type does not exist/)
  }
})
