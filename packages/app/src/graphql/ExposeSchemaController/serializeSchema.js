import getField from './getField'

export default async function serializeSchema(params) {
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    fields[key] = {
      ...params[key],
      type: await getField(params[key].type)
    }
  }

  return fields
}
