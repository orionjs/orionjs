import isArray from 'lodash/isArray'

export default function(model, item) {
  if (model.resolvers) {
    for (const key of Object.keys(model.resolvers)) {
      const resolver = model.resolvers[key]
      item[key] = function(params, context) {
        return resolver.resolve(item, params, context)
      }
    }
  }

  if (model.schema) {
    for (const key of Object.keys(model.schema)) {
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
