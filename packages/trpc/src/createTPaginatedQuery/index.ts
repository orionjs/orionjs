import {
  clean,
  cleanAndValidate,
  getSchemaFromAnyOrionForm,
  InferSchemaType,
  Schema,
  SchemaFieldType,
} from '@orion-js/schema'
import {mapErrorToTRPCError} from '../errorHandler'
import {t} from '../trpc'
import {computeSkip} from './computePagination'
import {getPaginatedParams} from './params'

// Cursor interface - must have skip, limit, sort, and toArray
export interface PaginatedCursor<TItem = any> {
  skip: (value: number) => void
  limit: (value: number) => void
  sort: (value: {[key: string]: 1 | -1}) => void
  toArray: () => Promise<TItem[]>
}

// Helper type to extract TItem from PaginatedCursor
type ExtractCursorItem<T> = T extends PaginatedCursor<infer U> ? U : never

// Action types
export type PaginatedAction = 'getItems' | 'getCount' | 'getDescription'

// Base params that are always available
type BaseParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortType?: 'asc' | 'desc'
}

type MergedParams<TParams extends SchemaFieldType> = BaseParams & InferSchemaType<TParams>

// Input for the query
export interface PaginatedQueryInput<TParams extends SchemaFieldType = any> {
  action: PaginatedAction
  params: MergedParams<TParams>
}

// Description response
export interface PaginatedDescription {
  allowedSorts: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
}

// Items response
export interface PaginatedItemsResponse<TItem> {
  items: TItem[]
}

// Count response
export interface PaginatedCountResponse {
  totalCount: number
}

// Union of all responses
export type PaginatedResponse<TItem> =
  | PaginatedItemsResponse<TItem>
  | PaginatedCountResponse
  | PaginatedDescription

// Options interface with getCursor as the source of TItem inference
export interface TPaginatedQueryOptions<
  TParams extends SchemaFieldType = any,
  TCursor extends PaginatedCursor = PaginatedCursor,
  TViewer = any,
> {
  params?: TParams
  returns?: SchemaFieldType
  getCursor: (params: MergedParams<TParams>, viewer: TViewer) => Promise<TCursor> | TCursor
  getCount: (params: MergedParams<TParams>, viewer: TViewer) => Promise<number> | number
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
  defaultLimit?: number
  maxLimit?: number
}

export function createTPaginatedQuery<
  TParams extends SchemaFieldType,
  TCursor extends PaginatedCursor,
  TViewer = any,
>(options: TPaginatedQueryOptions<TParams, TCursor, TViewer>) {
  const paginatedParamsSchema = getPaginatedParams({
    params: options.params,
    allowedSorts: options.allowedSorts,
    defaultSortBy: options.defaultSortBy,
    defaultSortType: options.defaultSortType,
    defaultLimit: options.defaultLimit,
    maxLimit: options.maxLimit,
  })
  const returnsSchema = options.returns ? getSchemaFromAnyOrionForm(options.returns) : undefined

  // Schema for cleaning items array (only used if returns schema is provided)
  const itemsWrapperSchema: Schema | undefined = returnsSchema
    ? {
        items: {type: [returnsSchema] as any},
      }
    : undefined

  // Extract TItem from TCursor
  type TItem = ExtractCursorItem<TCursor>
  type Input = PaginatedQueryInput<TParams>
  type Output = PaginatedResponse<TItem>

  return t.procedure
    .input((val: unknown) => val as Input)
    .query(async ({ctx, input}): Promise<Output> => {
      try {
        const {action, params: rawParams} = input

        // Handle getDescription action - doesn't need params validation
        if (action === 'getDescription') {
          return {
            allowedSorts: options.allowedSorts || [],
            defaultSortBy: options.defaultSortBy,
            defaultSortType: options.defaultSortType,
          } satisfies PaginatedDescription
        }

        // Validate and clean params
        const cleanedParams = (await cleanAndValidate(
          paginatedParamsSchema,
          rawParams,
        )) as MergedParams<TParams>

        const page = cleanedParams.page ?? 1
        const limit = cleanedParams.limit ?? 20

        // Handle getCount action
        if (action === 'getCount') {
          const totalCount = await options.getCount(cleanedParams, ctx.viewer as TViewer)
          return {totalCount} satisfies PaginatedCountResponse
        }

        // Handle getItems action
        if (action === 'getItems') {
          const skip = computeSkip(page, limit)
          const {sortBy, sortType} = cleanedParams

          // Get cursor and apply pagination
          const cursor = await options.getCursor(cleanedParams, ctx.viewer as TViewer)

          cursor.skip(skip)
          cursor.limit(limit)

          if (sortBy && sortType) {
            cursor.sort({[sortBy]: sortType === 'asc' ? 1 : -1})
          }

          // Get items
          const items = await cursor.toArray()

          // Clean items if returns schema is provided
          let cleanedItems: TItem[]
          if (itemsWrapperSchema) {
            const cleanedWrapper = (await clean(itemsWrapperSchema, {items})) as {
              items: TItem[]
            }
            cleanedItems = cleanedWrapper.items
          } else {
            cleanedItems = items as TItem[]
          }

          return {
            items: cleanedItems,
          } satisfies PaginatedItemsResponse<TItem>
        }

        throw new Error(`Unknown action: ${action}`)
      } catch (error) {
        throw mapErrorToTRPCError(error as Error)
      }
    })
}
