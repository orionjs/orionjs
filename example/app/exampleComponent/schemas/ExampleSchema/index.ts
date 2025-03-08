import {Prop, TypedSchema} from '@orion-js/typed-model'

@TypedSchema()
export class ExampleSchema {
  @Prop()
  _id: string

  @Prop()
  name: string

  @Prop()
  createdAt: Date
}
