import Model from '../../Model'
import resolver from '../resolver'

export default ({collection, modelName}) => {
  const items = resolver({
    name: 'items',
    returns: [collection.model],
    async resolve({cursor}) {
      return await cursor.toArray()
    }
  })

  return new Model({
    name: modelName || `tokenPaginated${collection.model.name}`,
    resolvers: {
      items
    }
  })
}
