import createModel from './index'

it('should validate a schema', async () => {
  const model = createModel({
    name: 'AModel',
    schema: {
      name: {
        type: String
      }
    }
  })

  await model.validate({name: 'String'})
})

it('should allow deep model validation', async () => {
  const model2 = createModel({
    name: 'AModel',
    schema: {
      firstName: {
        type: String
      },
      lastName: {
        type: String
      }
    }
  })

  const model1 = createModel({
    name: 'AModel2',
    schema: {
      data: {
        type: model2
      }
    }
  })

  await model1.validate({data: {firstName: 'Nicolás', lastName: 'López'}})

  expect.assertions(1)
  try {
    await model1.validate({})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
