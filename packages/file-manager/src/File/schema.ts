import {Prop, TypedSchema} from '@orion-js/typed-model'
import resolvers from './resolvers'
import {generateImageInfo} from '../resolvers/generateImageInfo'
import {pick} from 'rambdax'
import {getFileData} from './getFileData'

@TypedSchema()
export class FileSchemaResizeData {
  @Prop({optional: true, type: 'string'})
  thumbnailURL?: string // 100 height max

  @Prop({optional: true, type: 'string'})
  smallURL?: string // 300 height max

  @Prop({optional: true, type: 'string'})
  mediumURL?: string // 800 height max

  @Prop({optional: true, type: 'string'})
  largeURL?: string // 1400 height max

  @Prop({optional: true, type: 'string'})
  extraLargeURL?: string // 2400 height max
}

@TypedSchema()
export class FileSchemaDimensionsData {
  @Prop({optional: true, type: 'number'})
  width?: number

  @Prop({optional: true, type: 'number'})
  height?: number
}

@TypedSchema()
export class FileSchemaColorsData {
  @Prop({optional: true, type: 'string'})
  front?: string

  @Prop({optional: true, type: 'string'})
  background?: string

  @Prop({optional: true, type: 'string'})
  blurhash?: string
}

@TypedSchema({
  name: 'File',
  resolvers,
  // this is only called when its child
  async clean(value) {
    if (!value) return null
    const fileId = value._id
    const file = await getFileData(fileId)
    if (!file) return null

    await generateImageInfo(file)

    const keys = [
      '_id',
      'hash',
      'externalUrl',
      'key',
      'bucket',
      'name',
      'type',
      'size',
      // 'status',
      // 'createdBy',
      // 'createdAt',
      'dimensions',
      'resizedData',
      'colorsData',
    ]
    const data = pick(keys, file)
    return data
  },
})
export class FileSchema {
  @Prop({type: 'ID'})
  _id: string

  @Prop({optional: true, type: 'string'})
  hash?: string

  @Prop({optional: true, type: 'string'})
  externalUrl?: string

  @Prop({optional: true, type: 'string'})
  key?: string

  @Prop({optional: true, type: 'string'})
  bucket?: string

  @Prop({optional: true, type: 'string'})
  name?: string

  @Prop({optional: true, type: 'string'})
  type?: string

  @Prop({optional: true, type: 'number'})
  size?: number

  @Prop({optional: true, type: 'string'})
  status?: string

  @Prop({optional: true, type: 'string'})
  createdBy?: string

  @Prop({optional: true, type: Date})
  createdAt?: Date

  @Prop({optional: true, type: FileSchemaDimensionsData})
  dimensions?: FileSchemaDimensionsData

  @Prop({optional: true, type: FileSchemaResizeData})
  resizedData?: FileSchemaResizeData

  @Prop({optional: true, type: FileSchemaColorsData})
  colorsData?: FileSchemaColorsData
}
