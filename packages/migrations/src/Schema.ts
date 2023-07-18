import {TypedSchema, Prop} from '@orion-js/typed-model'

export type MigrationId = `scnmg-${string}`

@TypedSchema()
export class MigrationSchema {
  @Prop()
  _id: MigrationId

  @Prop()
  name: string

  @Prop()
  completedAt: Date
}
