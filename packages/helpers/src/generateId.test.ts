import generateId from './generateId'

it('should generate random ids', async () => {
  expect(generateId()).not.toBe(generateId())
  expect(generateId()).toBeTypeOf('string')
})
