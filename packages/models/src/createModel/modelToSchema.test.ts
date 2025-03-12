import createModel from '.'
import {clean, createEnum, SchemaNode} from '@orion-js/schema'
import {it, expect} from 'vitest'
import {sleep} from '../../../helpers/dist'

it('should add the __model field when converting to schema', async () => {
  const model = createModel({
    name: 'test',
    schema: {
      name: {type: String},
      age: {type: Number},
    },
  })

  const schema = model.getSchema() as any

  expect(schema.__modelName).toEqual('test')
})

it('can clean a schema with nested models', async () => {
  const model = createModel({
    name: 'AModel',
    schema: {
      name: {
        type: String,
      },
    },
    clean: () => ({name: 'Model Schema'}),
  })

  console.log('model1 schema', JSON.stringify(model.getSchema(), null, 2))

  await sleep(200)

  const finalModel = createModel({
    name: 'Test',
    schema: {
      subModel: {
        type: model,
      },
      subModelArray: {
        type: [model],
      },
      primitive: {
        type: String,
        clean: () => 'Primitive',
      },
    },
  })

  const schema = finalModel.getSchema()
  console.log('fina schema', JSON.stringify(schema, null, 2))

  const doc = {subModel: {name: 'Joaquin'}, subModelArray: [{name: 'Roberto'}], primitive: 'hello'}

  expect(await clean(schema, doc)).toEqual({
    subModel: {name: 'Model Schema'},
    subModelArray: [{name: 'Model Schema'}],
    primitive: 'Primitive',
  })
})

it('Should return a schema with __clean if clean param is passed to model', async () => {
  const clean = () => ({name: 'hello'})

  const model = createModel({
    name: 'test',
    schema: {
      name: {type: String},
      age: {type: Number},
    },
    clean,
  })

  const schema = model.getSchema() as any

  expect(await schema.__clean()).toEqual(await clean())
})

it('Should keep __modelName to sub schemas when calling getSchema', async () => {
  const friend = createModel({
    name: 'Friend',
    schema: {
      name: {type: 'string'},
    },
  }).getSchema()

  const model = createModel({
    name: 'test',
    schema: {
      name: {type: 'string'},
      friends: {type: [friend]},
    },
  })

  const schema = model.getSchema()

  expect(schema?.__modelName).toBe('test')
  expect((schema?.friends as SchemaNode).type[0]?.__modelName).toBeDefined()
})

it('Should convert custom fields correctly', async () => {
  const colorsEnum = createEnum('ColorsEnum', ['red', 'blue', 'green'])

  const model = createModel({
    name: 'test',
    schema: {
      color: {type: colorsEnum},
    },
  })

  expect((model.getSchema() as any).__modelName).toBe('test')
  console.log(model.getSchema().color.type)
  expect((model.getSchema() as any).color.type.__isFieldType).toBe(true)
})

it('should correctly pass the clean option to submodels', async () => {
  const clean = () => ({name: 'hello'})
  const FileModel = createModel({
    name: 'File',
    schema: {
      name: {
        type: String,
      },
    },
    clean,
  })

  const ConfigModel = createModel({
    name: 'Config',
    schema: {
      files: {
        type: [FileModel],
      },
    },
  })

  const example = {
    files: [
      {
        _id: '1',
      },
    ],
  }

  const cleanedAsModel = await ConfigModel.cleanAndValidate(example)
  expect(cleanedAsModel.files[0].name).toEqual('hello')
})
