import resolver from '../resolver'

export default ({name, collection, Model}) => {
  const InputModel = collection.model.clone({
    name: `Create${Model.name}`,
    omitFields: ['_id']
  })
  const dataParam = Model.name.toLowerCase()
  return resolver({
    name: `create${Model.name}`,
    params: {
      [dataParam]: {type: InputModel}
    },
    returns: Model,
    mutation: true,
    resolve: async function(params, viewer) {
      const data = params[dataParam]
      const itemId = await collection.insert(data)
      return await collection.findOne(itemId)
    }
  })
}
