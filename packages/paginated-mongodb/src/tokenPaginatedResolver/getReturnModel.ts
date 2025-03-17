import {createModel} from '@orion-js/models'
import {modelResolver} from '@orion-js/resolvers'

export default ({collection, modelName}) => {
  const items = modelResolver({
    returns: [collection.model],
    async resolve(params) {
      const {cursor} = params
      return await cursor.toArray()
    },
  })

  return createModel({
    name: modelName || `tokenPaginated${collection.model.name}`,
    resolvers: {
      items,
    },
  })
}
