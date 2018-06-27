import Model from './index'
import {resolver} from '../resolvers'
import ConfigurationError from '../Errors/ConfigurationError'

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

it('should throw an error when a model mutation resolver is not private', async () => {
  const AModel = new Model({
    name: 'AModel',
    schema: {
      name: {
        type: String
      }
    },
    resolvers: () => ({
      changeName: resolver({
        returns: Boolean,
        mutation: true,
        async resolve(model, params, viewer) {
          model.update({$set: {name: 'new name'}})
        }
      })
    })
  })

  // expect.assertions(1)
  try {
    const doc = await AModel.initItem({name: 'name'})
    await doc.changeName()
  } catch (error) {
    expect(error).toEqual(new ConfigurationError('Model mutation resolvers must be private'))
  }
})
