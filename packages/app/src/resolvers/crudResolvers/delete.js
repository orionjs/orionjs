import resolver from '../resolver'
export default ({name, collection, Model, canDelete}) => {
  const idParam = Model.name.toLowerCase() + 'Id'
  return resolver({
    params: {
      [idParam]: {
        type: String,
        async custom(itemId) {
          const count = await collection.find(itemId).count()
          if (!count) return `notFound`
        }
      }
    },
    returns: Model,
    mutation: true,
    resolve: async function(params, viewer) {
      const itemId = params[idParam]
      const item = await collection.findOne(itemId)
      if (canDelete) await canDelete(item, viewer)
      await collection.remove(itemId)
      return item
    }
  })
}
