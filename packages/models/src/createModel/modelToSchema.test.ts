import createModel from '.'

it('should add the __model field when converting to schema', async () => {
  const model = createModel({
    name: 'test',
    schema: {
      name: {type: String},
      age: {type: Number}
    }
  })

  const schema = model.getSchema() as any

  expect(schema.__model.name).toEqual('test')
})
