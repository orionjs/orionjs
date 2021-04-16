import resolver from '../resolver'
import config from '../../config'

export default ({name, collection, Model, canCreate}) => {
  const {logger} = config()
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
    resolve: async function (params, viewer) {
      try {
        const data = params[dataParam]
        if (canCreate) await canCreate(data, viewer)
        const itemId = await collection.insert(data)
        return await collection.findOne(itemId)
      } catch (error) {
        logger.warn('Error in crudResolver create: ', error)
        if (error.isValidationError) {
          throw error.prependKey(dataParam)
        }

        throw error
      }
    }
  })
}
