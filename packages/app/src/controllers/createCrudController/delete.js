import resolver from '../resolver'
export default ({name, collection, Model}) => {
  const idParam = Model.name.toLowerCase() + 'Id'
  return resolver({
    name: `delete${Model.name}`,
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
      await collection.remove(itemId)
      return item
    }
  })
}
