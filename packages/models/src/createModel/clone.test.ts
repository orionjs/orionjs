import createModel from './index'

describe('Cloning models', () => {
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

  it('should pass __clean and __validate to the cloned model schema', () => {
    const clean = name => `clean ${name}`

    const model1 = createModel({
      name: 'Model1',
      schema: {
        name: {type: String}
      },
      clean
    })

    const model2 = model1.clone({
      name: 'Model2'
    })

    const schema1 = model1.getSchema()
    const schema2 = model2.getSchema()

    expect(schema1.__clean).toBe(clean)
    expect(schema2.__clean).toBe(clean)
  })
})
