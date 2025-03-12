import {createModel} from '@orion-js/models'
import {Prop, TypedSchema} from '../decorators'
import {getModelForClass} from './getModelForClass'
import {describe, it, expect} from 'vitest'

describe('getModelForClass', () => {
  it('should correctly pass the clean option to submodels', async () => {
    const clean = () => ({name: 'hello'})
    const FileModel = createModel({
      name: 'File',
      schema: {
        name: {
          type: 'string',
        },
      },
      clean,
    })

    @TypedSchema()
    class Config {
      @Prop({
        type: [FileModel],
      })
      files: any
    }

    console.log(JSON.stringify(getModelForClass(Config).getSchema().files.type[0], null, 2))

    const schemaForConfig = getModelForClass(Config).getSchema()
    console.log(schemaForConfig.files.type[0])
    expect(schemaForConfig.files.type[0].__clean).toBeTypeOf('function')

    const ConfigAsModel = createModel({
      name: 'Config',
      schema: {
        files: {
          type: [FileModel],
        },
      },
    })

    const modelForClass = getModelForClass(Config)

    const example = {
      files: [
        {
          _id: '1',
        },
      ],
    }

    const cleanedAsModel = await ConfigAsModel.cleanAndValidate(example)
    expect(cleanedAsModel.files[0].name).toEqual('hello')

    const cleanedAsClass = await modelForClass.cleanAndValidate(example)
    expect(cleanedAsClass).toEqual(cleanedAsModel)
  })
})
