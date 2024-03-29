import getField from './getField'

export default function (params) {
  if (!params) return
  if (Object.keys(params).length === 0) return

  const fields = {}

  for (const key of Object.keys(params)) {
    try {
      const type = getField(params[key].type)
      fields[key] = {type}
    } catch (error) {
      throw new Error(`Error creating GraphQL resolver params argument ${key}: ${error.message}`)
    }
  }
  return fields
}
