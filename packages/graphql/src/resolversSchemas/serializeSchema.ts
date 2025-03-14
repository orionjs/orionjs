import {Schema, SchemaWithMetadata, getSchemaFromAnyOrionForm} from '@orion-js/schema'
import getField from './getField'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export default async function serializeSchema(params: Schema): Promise<SchemaWithMetadata> {
  if (!params) return

  const schema = getSchemaFromAnyOrionForm(params) as Schema

  if (Object.keys(schema).length === 0) return

  const fields = {}

  for (const key of Object.keys(schema).filter(key => !key.startsWith('__'))) {
    const field = schema[key]
    fields[key] = await getField(field)
  }

  return fields
}
