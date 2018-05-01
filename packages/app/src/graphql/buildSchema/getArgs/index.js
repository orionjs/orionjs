import getField from './getField'

export default async function(params) {
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    fields[key] = {
      type: await getField(params[key].type)
    }
  }

  return fields
}
