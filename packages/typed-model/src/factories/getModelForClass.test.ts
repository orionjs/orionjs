import {createModel} from '@orion-js/models'
import {Prop, TypedSchema} from '../decorators'
import {getModelForClass} from './getModelForClass'

describe('getModelForClass', () => {
  it('should correctly pass the clean option to submodels', async () => {
    const clean = () => ({name: 'hello'})
    const FileModel = createModel({
      name: 'File',
      schema: {
        name: {
          type: String
        }
      },
      clean
    })

    @TypedSchema()
    class Config {
      @Prop({
        type: [FileModel]
      })
      files: any
    }

    const ConfigAsModel = createModel({
      name: 'Config',
      schema: {
        files: {
          type: [FileModel]
        }
      }
    })

    const modelForClass = getModelForClass(Config)

    const example = {
      files: [
        {
          _id: '1'
        }
      ]
    }

    const cleanedAsModel = await ConfigAsModel.cleanAndValidate(example)
    expect(cleanedAsModel.files[0].name).toEqual('hello')

    const cleanedAsClass = await modelForClass.cleanAndValidate(example)
    expect(cleanedAsClass).toEqual(cleanedAsModel)
  })
})
