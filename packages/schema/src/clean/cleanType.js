import getFieldType from '../getValidationErrors/getError/getFieldType'

export default async function(type, fieldSchema, value, info, ...args) {
  const {clean} = await getFieldType(type)

  if (clean) {
    value = await clean(value, info, ...args)
  }

  if (fieldSchema.autoValue) {
    value = await fieldSchema.autoValue(value, info, ...args)
  }

  return value
}
