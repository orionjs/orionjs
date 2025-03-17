import {hashObject} from '@orion-js/helpers'
import {createModelResolver} from '@orion-js/resolvers'
import {getSchemaFromAnyOrionForm, InferSchemaType, Schema} from '@orion-js/schema'
import {PaginatedCursor} from '.'

export function getPaginatedResolverReturnSchema<TParams extends Schema>(paramsSchema: TParams) {
  return {
    cursor: {
      type: 'any',
      private: true,
    },
    params: {
      type: paramsSchema,
      private: true,
    },
    viewer: {
      type: 'any',
      private: true,
    },
    options: {
      type: 'any',
      private: true,
    },
    count: {
      type: 'integer',
      private: true,
    },
  } as const
}

type PaginatedModelResolversInput<TParams extends Schema, TReturns extends Schema> = {
  cursor: PaginatedCursor<TReturns>
  params: InferSchemaType<TParams>
  viewer: any
  options: any
  count: number
}

export function getPaginatedResolverResolvers<TParams extends Schema, TReturns extends Schema>(
  modelName: string,
  returns: TReturns,
) {
  type Item = PaginatedModelResolversInput<TParams, TReturns>

  const getTotalCount = async (paginated: Item) => {
    if (typeof paginated.count === 'undefined') {
      paginated.count = await paginated.cursor.count()
    }
    return paginated.count
  }

  const _id = createModelResolver<Item>({
    returns: 'ID',
    async resolve(paginated, viewer): Promise<string> {
      const {params} = paginated
      return hashObject({
        modelName: modelName,
        userId: viewer.userId,
        params: params,
      })
    },
  })

  const totalCount = createModelResolver<Item>({
    returns: 'integer',
    resolve: getTotalCount,
  })

  const totalPages = createModelResolver<Item>({
    returns: 'integer',
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      if (!paginated.options.limit) return 1
      return Math.ceil(count / paginated.options.limit)
    },
  })

  const hasNextPage = createModelResolver<Item>({
    returns: Boolean,
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      const {skip, limit} = paginated.options
      if (!limit) return false
      return skip + limit < count
    },
  })

  const hasPreviousPage = createModelResolver<Item>({
    returns: Boolean,
    async resolve(paginated) {
      const count = await getTotalCount(paginated)
      const {skip} = paginated.options
      return count && skip !== 0
    },
  })

  const items = createModelResolver<Item>({
    returns: [getSchemaFromAnyOrionForm(returns)],
    async resolve(params) {
      const result = (await params.cursor.toArray()) as InferSchemaType<TReturns[]>
      return result
    },
  })

  return {
    _id,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    items,
  }
}
