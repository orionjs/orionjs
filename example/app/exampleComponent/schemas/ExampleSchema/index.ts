import { createEnum } from '@orion-js/schema'
import { Prop, TypedSchema } from '@orion-js/typed-model'


export const ExampleTypeEnum = createEnum('ExampleTypeEnum', [
  'type1',
  'type2',
  'type3',
] as const)

@TypedSchema()
export class ExampleSchema {
  @Prop()
  _id: string

  @Prop()
  name: string

  @Prop()
  createdAt: Date

  @Prop({ optional: true, type: ExampleTypeEnum })
  paymentMethod?: typeof ExampleTypeEnum.type

}
