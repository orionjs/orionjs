import {TypedId, typedId} from '@orion-js/mongodb'
import {InferSchemaType, schemaWithName} from '@orion-js/schema'

export type MigrationId = TypedId<'scnmg'>

export const MigrationSchema = schemaWithName('Migration', {
  _id: {
    type: typedId('scnmg'),
  },
  name: {
    type: String,
  },
  completedAt: {
    type: Date,
  },
})

export type MigrationType = InferSchemaType<typeof MigrationSchema>
