import getField from './getField'

it('should return a valid serialization of the field', async () => {
  const schema = {
    name: {
      type: String,
      a: '1234'
    }
  }
  const result = await getField(schema.name)
  expect(result).toEqual({type: 'string', a: '1234', __graphQLType: 'String'})
})

it('should pass field options with simple array fields', async () => {
  const schema = {
    name: {
      type: [String],
      a: '1234'
    }
  }
  const result = await getField(schema.name)
  expect(result.a).toEqual(schema.name.a)
})
