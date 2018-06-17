import Model from './index'

it('should validate a schema', async () => {
  const model = new Model({
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
  const model2 = new Model({
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

  const model1 = new Model({
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

it('allow custom model validation', async () => {
  let called = false
  let called2 = false
  const model = new Model({
    name: 'AModel',
    schema: {
      name: {
        type: String
      }
    },
    async validate(doc) {
      called = true
    },
    async clean(doc) {
      called2 = true
    }
  })

  await model.validate({name: 'Nicolás'})
  await model.clean({name: 'Nicolás'})
  expect(called).toBe(true)
  expect(called2).toBe(true)
})
