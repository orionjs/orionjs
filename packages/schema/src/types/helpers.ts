import {Schema} from './schema'

export type MergeSchemas<SchemaA extends Schema, SchemaB extends Schema> = SchemaA & SchemaB
