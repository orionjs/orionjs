import {Schema} from '@orion-js/schema'
import getField from './getField'

export default async function serializeSchema(params): Promise<Schema> {
  if (!params) return

  if (typeof params === 'function' && params.getModel && params.__schemaId) {
    params = params.getModel().getCleanSchema() // typed model
  }

  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    const field = params[key]
    fields[key] = await getField(field)
  }

  return fields
}
