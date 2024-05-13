import {Prop, TypedSchema} from '@orion-js/typed-model'

@TypedSchema()
export class FileSchema {
  @Prop({type: 'ID'})
  _id: string

  @Prop({
    optional: true
  })
  hash?: string

  @Prop({
    optional: true,
    private: true
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
}
