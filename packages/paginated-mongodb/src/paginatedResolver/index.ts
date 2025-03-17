import {createResolver, getResolverArgs, internal_schemaWithResolvers} from '@orion-js/resolvers'
import {getPaginatedResolverParams, paginatedResolverBaseParamsSchema} from './params'
import setOptions from './setOptions'
import {getSchemaWithMetadataFromAnyOrionForm, InferSchemaType, Schema} from '@orion-js/schema'
import {getPaginatedResolverResolvers, getPaginatedResolverReturnSchema} from './getModel'

export interface PaginatedCursor<TReturns extends Schema = any> {
  count?: () => Promise<number> | number
  toArray: () => Promise<InferSchemaType<TReturns>[]>
  limit?: (newLimit: number) => void
  skip?: (newSkip: number) => void
  sort?: (newSort: {[key: string]: 1 | -1}) => void
}

export type PaginatedResolverGetCursorResultWithCount<TReturns extends Schema = any> = {
  count: () => Promise<number> | number
  cursor: PaginatedCursor<TReturns>
}

export type PaginatedResolverGetCursorResult<TReturns extends Schema = any> =
  | PaginatedCursor<TReturns>
  | PaginatedResolverGetCursorResultWithCount<TReturns>

export interface PaginatedResolverOpts<
  TParams extends Schema = any,
  TReturns extends Schema = any,
  TViewer = any,
> {
  returns: TReturns
  getCursor: (
    params?: InferSchemaType<typeof paginatedResolverBaseParamsSchema & TParams>,
    viewer?: TViewer,
  ) => Promise<PaginatedResolverGetCursorResult<TReturns>>
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
  params?: TParams
  modelName?: string
  /**
   * @deprecated Just check the permissions in the resolver instead
   */
  permissionsOptions?: any
}

export function createPaginatedResolver<
  TParams extends Schema = any,
  TReturns extends Schema = any,
  TViewer = any,
>({
  returns,
  params,
  allowedSorts,
  defaultSortBy,
  defaultSortType,
  getCursor,
  modelName,
  ...otherOptions
}: PaginatedResolverOpts<TParams, TReturns, TViewer>) {
  const getCursorResult = async (...args) => {
    const result = await getCursor(...args)
    if ((result as PaginatedResolverGetCursorResultWithCount).cursor) {
      const resultWithCount = result as PaginatedResolverGetCursorResultWithCount
      return {cursor: resultWithCount.cursor, getCount: () => resultWithCount.count()}
    }
    const resultWithoutCount = result as PaginatedCursor
    return {cursor: resultWithoutCount, getCount: () => resultWithoutCount.count()}
  }

  const ReturnsModel = getSchemaWithMetadataFromAnyOrionForm(returns)
  const finalModelName = modelName || `Paginated${ReturnsModel.__modelName}`
  const paginatedParams = getPaginatedResolverParams<TParams>({
    params,
    allowedSorts,
    defaultSortBy,
    defaultSortType,
  })
  const baseReturnSchema = getPaginatedResolverReturnSchema(paginatedParams)
  const resolvers = getPaginatedResolverResolvers<TParams, TReturns>(modelName, returns)

  return createResolver({
    params: paginatedParams,
    returns: internal_schemaWithResolvers({
      name: finalModelName,
      schema: baseReturnSchema,
      resolvers: resolvers as any,
    }) as typeof baseReturnSchema,
    async resolve(...args) {
      const {params, viewer} = getResolverArgs(...args)
      const {cursor, getCount} = await getCursorResult(...args)

      /* counting the total number of elements of this cursor, so we make sure
       that it is going to be computed only once */
      const count = await getCount()
      const options = setOptions(params, cursor)

      return {
        cursor,
        params,
        viewer,
        options,
        count,
      }
    },
    ...otherOptions,
  })
}

/**
 * @deprecated Use createPaginatedResolver instead
 */
export const paginatedResolver = createPaginatedResolver
