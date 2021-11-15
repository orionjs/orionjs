import {createModel} from '@orion-js/models'
import hash from './hash'
import {modelResolver} from '@orion-js/resolvers'

export default ({returns, modelName}) => {
  const getTotalCount = async function (paginated) {
    if (typeof paginated.count === 'undefined') {
      paginated.count = await paginated.cursor.count()
    }
    return paginated.count
  }

  const _id = modelResolver({
    returns: 'ID',
    async resolve(paginated: any, p, viewer): Promise<string> {
      const {params} = paginated
      const num = hash({
        modelName: modelName,
        typename: returns.name,
        userId: viewer.userId,
        params: params
      })
      return String(Math.abs(num))
    }
  })

  const totalCount = modelResolver({
    returns: 'integer',
    resolve: getTotalCount
  })

  const totalPages = modelResolver({
    returns: 'integer',
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      if (!paginated.options.limit) return 1
      return Math.ceil(count / paginated.options.limit)
    }
  })

  const hasNextPage = modelResolver({
    returns: Boolean,
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      const {skip, limit} = paginated.options
      if (!limit) return false
      return skip + limit < count
    }
  })

  const hasPreviousPage = modelResolver({
    returns: Boolean,
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      const {skip} = paginated.options
      return count && skip !== 0
    }
  })

  const items = modelResolver({
    returns: [returns],
    async resolve({cursor}) {
      return await cursor.toArray()
    }
  })

  return createModel({
    name: modelName || `Paginated${returns.name}`,
    resolvers: {
      _id,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      items
    }
  })
}
