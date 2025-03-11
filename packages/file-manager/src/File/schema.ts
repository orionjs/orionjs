import {getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'

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

@TypedSchema()
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

  @Prop({optional: true, type: getModelForClass(FileSchemaDimensionsData)})
  dimensions?: FileSchemaDimensionsData

  @Prop({optional: true, type: getModelForClass(FileSchemaResizeData)})
  resizedData?: FileSchemaResizeData

  @Prop({optional: true, type: getModelForClass(FileSchemaColorsData)})
  colorsData?: FileSchemaColorsData
}
