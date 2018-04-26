import getFieldValidator from './getFieldValidator'

test('returns object validator when an object is passed', async () => {
  const validator = await getFieldValidator({name: {type: String}})
  expect(validator).toBe('plainObject')
})

test('returns array validator when an array is passed', async () => {
  const validator = await getFieldValidator([String])
  expect(validator).toBe('array')
})

test('returns string validator when a string is passed', async () => {
  const validator = await getFieldValidator(String)
  expect(validator).toBe('string')
})

test('returns unkown field validator when an unkown type is passed', async () => {
  const validator = await getFieldValidator('an unknown type')
  expect(validator).toBe('unkown')
})
