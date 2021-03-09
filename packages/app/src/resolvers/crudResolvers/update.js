import resolver from '../resolver'
import config from '../../config'

export default ({name, collection, Model, canUpdate}) => {
  const {logger} = config()
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
    resolve: async function (params, viewer) {
      try {
        if (canUpdate) await canUpdate(params, viewer)
        const itemId = params[idParam]
        const data = params[dataParam]
        await collection.update(itemId, {$set: data})
        return await collection.findOne(itemId)
      } catch (error) {
        logger.warn('Error in crudResolver update: ', error)
        if (error.isValidationError) {
          throw error.prependKey(dataParam)
        }

        throw error
      }
    }
  })
}
