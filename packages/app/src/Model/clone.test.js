import Model from './index'

it('cloned model should pick fields correctly', async () => {
  const type = {
    type: String
  }
  const model1 = new Model({
    name: 'AModel',
    schema: {
      a: type,
      b: type,
      c: type
    }
  })

  const model2 = model1.clone({
    pickFields: ['a', 'b']
  })

  const model3 = model2.clone({
    omitFields: ['b']
  })

  const keys = Object.keys(model3.schema).filter(key => !key.startsWith('__'))

  expect(keys).toEqual(['a'])
})
