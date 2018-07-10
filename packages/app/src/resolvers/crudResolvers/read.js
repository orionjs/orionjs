import resolver from '../resolver'
export default ({name, collection, Model, canRead}) => {
  const idParam = Model.name.toLowerCase() + 'Id'
  return resolver({
    params: {
      [idParam]: {type: String}
    },
    returns: Model,
    mutation: false,
    resolve: async function(params, viewer) {
      const itemId = params[idParam]
      const item = await collection.findOne(itemId)
      if (canRead) await canRead(item, viewer)
      return item
    }
  })
}
