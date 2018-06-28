import isArray from 'lodash/isArray'
import isPlainObject from 'lodash/isPlainObject'
import isNil from 'lodash/isNil'

export default function(model, item) {
  if (isNil(item)) {
    return item
  }

  if (!isPlainObject(item)) {
    console.warn(`When initializing a item in ${model.name} recieved a non object value`, item)
    return
  }

  if (model.resolvers) {
    for (const key of Object.keys(model.resolvers)) {
      const resolver = model.resolvers[key]
      item[key] = function(params, context) {
        return resolver.resolve(item, params, context)
      }
    }
  }

  if (model.schema) {
    const keys = Object.keys(model.schema).filter(key => !key.startsWith('__'))
    for (const key of keys) {
      const fieldSchema = model.schema[key]
      if (!fieldSchema.type) continue
      const fieldModel = isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type
      if (!fieldModel.__model) continue
      if (!item[key]) continue
      if (isArray(fieldSchema.type)) {
        if (!isArray(item[key])) continue
        item[key] = item[key].map(item => fieldModel.__model.initItem(item))
      } else {
        item[key] = fieldModel.__model.initItem(item[key])
      }
    }
  }

  return item
}
