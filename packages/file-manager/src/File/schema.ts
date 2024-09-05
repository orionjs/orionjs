import {getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'

@TypedSchema()
export class FileSchemaResizeData {
  @Prop({optional: true})
  thumbnailURL?: string // 100 height max

  @Prop({optional: true})
  smallURL?: string // 300 height max

  @Prop({optional: true})
  mediumURL?: string // 800 height max

  @Prop({optional: true})
  largeURL?: string // 1400 height max

  @Prop({optional: true})
  extraLargeURL?: string // 2400 height max
}

@TypedSchema()
export class FileSchemaDimensionsData {
  @Prop({optional: true})
  width?: number

  @Prop({optional: true})
  height?: number
}

@TypedSchema()
export class FileSchemaColorsData {
  @Prop({optional: true})
  front?: string

  @Prop({optional: true})
  background?: string

  @Prop({optional: true})
  blurhash?: string
}

@TypedSchema()
export class FileSchema {
  @Prop({type: 'ID'})
  _id: string

  @Prop({optional: true})
  hash?: string

  @Prop({
    optional: true,
    private: true,
  })
  externalUrl?: string

  @Prop({optional: true})
  key?: string

  @Prop({optional: true})
  bucket?: string

  @Prop({optional: true})
  name?: string

  @Prop({optional: true})
  type?: string

  @Prop({optional: true})
  size?: number

  @Prop({optional: true})
  status?: string

  @Prop({optional: true})
  createdBy?: string

  @Prop({optional: true})
  createdAt?: Date

  @Prop({optional: true, type: getModelForClass(FileSchemaDimensionsData)})
  dimensions?: FileSchemaDimensionsData

  @Prop({optional: true, type: getModelForClass(FileSchemaResizeData)})
  resizedData?: FileSchemaResizeData

  @Prop({optional: true, type: getModelForClass(FileSchemaColorsData)})
  colorsData?: FileSchemaColorsData
}
