import {TypedId, typedId} from '@orion-js/mongodb'
import {createEnum, InferSchemaType, schemaWithName} from '@orion-js/schema'

export const PaymentMethodEnum = createEnum('PaymentMethodEnum', [
  'type1',
  'type2',
  'type3',
] as const)

export type ExampleId = TypedId<'ex'>

export const ExampleSchema = schemaWithName('ExampleSchema', {
  _id: {
    type: typedId('ex'),
  },
  name: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
  paymentMethod: {
    type: PaymentMethodEnum,
    optional: true,
  },
})

export type ExampleType = InferSchemaType<typeof ExampleSchema>
