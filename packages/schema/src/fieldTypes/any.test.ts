import any from './any'

test('return no error when the value is correct', async () => {
  expect(any.validate({name: null})).toBeFalsy()
  expect(any.validate({name: 'Nicolás'})).toBeFalsy()
  expect(any.validate(1)).toBeFalsy()
  expect(any.validate('string')).toBeFalsy()
  expect(any.validate(['hello'])).toBeFalsy()
})
