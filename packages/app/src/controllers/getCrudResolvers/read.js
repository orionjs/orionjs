import resolver from '../resolver'
export default ({name, collection, Model}) => {
  const idParam = Model.name.toLowerCase() + 'Id'
  return resolver({
    name: Model.name.toLowerCase(),
    params: {
      [idParam]: {type: String}
    },
    returns: Model,
    mutation: false,
    resolve: async function(params, viewer) {
      const itemId = params[idParam]
      return await collection.findOne(itemId)
    }
  })
}
