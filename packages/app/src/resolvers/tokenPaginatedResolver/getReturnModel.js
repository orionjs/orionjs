import Model from '../../Model'
import hash from '../paginatedResolver/hash'
import resolver from '../resolver'

export default ({collection, modelName}) => {
  const _id = resolver({
    name: '_id',
    returns: 'ID',
    async resolve({params}, viewer) {
      const num = hash({
        modelName: modelName,
        typename: collection.model.name,
        userId: viewer.userId,
        params: params
      })
      return Math.abs(num)
    }
  })

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
      _id,
      items
    }
  })
}
