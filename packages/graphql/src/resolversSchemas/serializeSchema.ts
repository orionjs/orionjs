import {Schema, SchemaWithMetadata, getSchemaFromAnyOrionForm} from '@orion-js/schema'
import getField from './getField'

export default async function serializeSchema(params: Schema): Promise<SchemaWithMetadata> {
  if (!params) return

  const schema = getSchemaFromAnyOrionForm(params) as Schema

  if (Object.keys(schema).length === 0) return

  const fields = {}

  console.log(schema, 'schema')
  for (const key of Object.keys(schema).filter(key => !key.startsWith('__'))) {
    const field = schema[key]
    fields[key] = await getField(field)
    console.log(fields[key], field)
  }

  console.log(fields, 'fields')

  return fields
}
