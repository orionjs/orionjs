import getFieldType from '../getValidationErrors/getError/getFieldType'
import isNil from 'lodash/isNil'

export default async function(type, fieldSchema, value, info, ...args) {
  const {clean} = await getFieldType(type)

  if (clean && !isNil(value)) {
    value = await clean(value, info, ...args)
  }

  const {defaultValue} = fieldSchema
  if (isNil(value) && !isNil(defaultValue)) {
    if (typeof defaultValue === 'function') {
      value = await defaultValue(info, ...args)
    } else {
      value = defaultValue
    }
  }

  const {autoValue} = fieldSchema
  if (autoValue) {
    value = await autoValue(value, info, ...args)
  }

  return value
}
