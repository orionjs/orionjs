import serializeSchema from './serializeSchema'

it('should create a JSON of the schema', async () => {
  const schema = {
    name: {
      type: String
    }
  }
  const result = await serializeSchema(schema)
  expect(result).toEqual({name: {type: 'string', __graphQLType: 'String'}})
})

it('should pass field options', async () => {
  const schema = {
    name: {
      type: [String],
      a: '1234'
    }
  }
  const result = await serializeSchema(schema)
  expect(result.name.a).toEqual(schema.name.a)
})
