import getField from './getField'

export default async function serializeSchema(params): Promise<any> {
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    const field = params[key]
    fields[key] = await getField(field)
  }

  return fields
}
