export default function(model, item) {
  if (model.resolvers) {
    for (const key of Object.keys(model.resolvers)) {
      const resolver = model.resolvers[key]
      item[key] = function(params, context) {
        return resolver.resolve(item, params, context)
      }
    }
  }

  return item
}
