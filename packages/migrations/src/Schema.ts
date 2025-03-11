import { TypedSchema, Prop } from '@orion-js/typed-model'

export type MigrationId = `scnmg-${string}`

@TypedSchema()
export class MigrationSchema {
  @Prop({ type: 'string' })
  _id: MigrationId

  @Prop({ type: String })
  name: string

  @Prop({ type: Date })
  completedAt: Date
}
