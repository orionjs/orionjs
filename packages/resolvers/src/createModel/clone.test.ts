import createModel from './index'

it('cloned model should pick fields correctly', async () => {
  const type = {
    type: String
  }
  const model1 = createModel({
    name: 'AModel',
    schema: {
      a: type,
      b: type,
      c: type
    }
  })

  const model2 = model1.clone({
    name: 'Cloned2',
    pickFields: ['a', 'b']
  })

  const model3 = model2.clone({
    name: 'Cloned3',
    omitFields: ['b']
  })

  const schema = model3.getSchema()
  const keys = Object.keys(schema).filter(key => !key.startsWith('__'))

  expect(keys).toEqual(['a'])
})
