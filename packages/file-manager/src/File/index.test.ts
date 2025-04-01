import {FileSchema} from './schema'
import {Files} from '../Files'
import {createModel} from '@orion-js/models'
import {Prop, TypedSchema, getModelForClass} from '@orion-js/typed-model'
import {describe, it, expect} from 'vitest'

describe('File model', () => {
  it('should correctly clean on a simple file input', async () => {
    await (await Files.getRawCollection()).insertOne({
      _id: '1',
      externalUrl: 'https://example.com/file.jpg',
    })

    const input = {
      name: 'test',
      image: {
        _id: '1',
      },
    }

    const model = createModel({
      name: 'Test',
      schema: {
        name: {
          type: String,
        },
        image: {
          type: FileSchema,
        },
      },
    })

    const cleaned = await model.clean(input)

    expect(cleaned).toEqual({
      name: 'test',
      image: {
        _id: '1',
        externalUrl: 'https://example.com/file.jpg',
      },
    })
  })

  it('should correctly clean the file input on a complex schema', async () => {
    await (await Files.getRawCollection()).insertOne({
      _id: '2',
      externalUrl: 'https://example.com/file.jpg',
    })

    @TypedSchema()
    class Banner {
      @Prop({
        type: FileSchema,
      })
      image: FileSchema

      @Prop({type: String})
      name: string
    }

    const cleanedBanner = await getModelForClass(Banner).clean({
      name: 'test',
      image: {
        _id: '2',
      },
    })

    expect(cleanedBanner).toEqual({
      name: 'test',
      image: {
        _id: '2',
        externalUrl: 'https://example.com/file.jpg',
      },
    })

    @TypedSchema()
    class Config {
      @Prop({type: [getModelForClass(Banner)]})
      banners: Banner[]
    }

    const cleaned = await getModelForClass(Config).cleanAndValidate({
      banners: [cleanedBanner],
    })

    expect(cleaned).toEqual({
      banners: [
        {
          name: 'test',
          image: {
            _id: '2',
            externalUrl: 'https://example.com/file.jpg',
          },
        },
      ],
    })
  })
})
