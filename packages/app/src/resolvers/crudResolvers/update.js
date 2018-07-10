import resolver from '../resolver'

export default ({name, collection, Model, canUpdate}) => {
  const InputModel = collection.model.clone({
    name: `Update${Model.name}`,
    omitFields: ['_id'],
    mapFields(field, key) {
      field.optional = true
      return field
    }
  })

  const idParam = Model.name.toLowerCase() + 'Id'
  const dataParam = Model.name.toLowerCase()
  return resolver({
    params: {
      [idParam]: {
        type: String,
        async custom(itemId) {
          const count = await collection.find(itemId).count()
          if (!count) return `notFound`
        }
      },
      [dataParam]: {type: InputModel}
    },
    returns: Model,
    mutation: true,
    resolve: async function(params, viewer) {
      if (canUpdate) await canUpdate(params, viewer)
      const itemId = params[idParam]
      const data = params[dataParam]
      await collection.update(itemId, {$set: data})
      return await collection.findOne(itemId)
    }
  })
}
