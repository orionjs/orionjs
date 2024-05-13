import createModel from '.'
import {clean} from '@orion-js/schema'

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

it('can clean a schema with nested models', async () => {
  const model = createModel({
    name: 'AModel',
    schema: {
      name: {
        type: String
      }
    },
    clean: () => ({name: 'Model Schema'})
  })

  const finalModel = createModel({
    name: 'Test',
    schema: {
      subModel: {
        type: model
      },
      subModelArray: {
        type: [model]
      },
      primitive: {
        type: String,
        clean: () => 'Primitive'
      }
    }
  })

  const doc = {subModel: {name: 'Joaquin'}, subModelArray: [{name: 'Roberto'}], primitive: 'hello'}

  const schema = finalModel.getSchema()

  expect(await clean(schema, doc)).toEqual({
    subModel: {name: 'Model Schema'},
    subModelArray: [{name: 'Model Schema'}],
    primitive: 'Primitive'
  })
})

it('Should return a schema with __clean if clean param is passed to model', async () => {
  const clean = () => ({name: 'hello'})

  const model = createModel({
    name: 'test',
    schema: {
      name: {type: String},
      age: {type: Number}
    },
    clean
  })

  const schema = model.getSchema() as any

  expect(await schema.__clean()).toEqual(await clean())
})
