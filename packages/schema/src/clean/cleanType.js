import getFieldType from '../getValidationErrors/getError/getFieldType'

export default async function(type, value, info, ...args) {
  const {clean} = await getFieldType(type)
  if (!clean) return value
  return await clean(value, info, ...args)
}
