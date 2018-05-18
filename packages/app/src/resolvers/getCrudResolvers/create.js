import resolver from '../resolver'

export default ({name, collection, Model}) => {
  const InputModel = collection.model.clone({
    name: `Create${Model.name}`,
    omitFields: ['_id']
  })
  const dataParam = Model.name.toLowerCase()
  return resolver({
    params: {
      [dataParam]: {type: InputModel}
    },
    returns: Model,
    mutation: true,
    resolve: async function(params, viewer) {
      try {
        const data = params[dataParam]
        const itemId = await collection.insert(data)
        return await collection.findOne(itemId)
      } catch (error) {
        console.log(error)
        if (error.isValidationError) {
          throw error.prependKey(dataParam)
        }

        throw error
      }
    }
  })
}
