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
import {getPaginationSchema, getUserParamsSchema} from './params'

// Action types
export type PaginatedAction = 'getItems' | 'getCount' | 'getDescription'

// Pagination params passed to getItems - ready to use with MongoDB
export interface PaginationParams {
  skip: number
  limit: number
  sort: {[key: string]: 1 | -1}
}

// Pagination fields from input
type PaginationFields = {
  page?: number
  limit?: number
  sortBy?: string
  sortType?: 'asc' | 'desc'
}

// Helper to determine params type - use empty object when no params defined
type ResolveParamsType<TParams> = TParams extends undefined
  ? Record<string, never>
  : InferSchemaType<TParams> extends void
    ? Record<string, never>
    : InferSchemaType<TParams>

// Input for the query - pagination fields are top-level, user params are in params
export interface PaginatedQueryInput<TParams extends SchemaFieldType | undefined = undefined> {
  action: PaginatedAction
  page?: number
  limit?: number
  sortBy?: string
  sortType?: 'asc' | 'desc'
  params: ResolveParamsType<TParams>
}

// Response with all optional fields
export interface PaginatedResponse<TItem> {
  items?: TItem[]
  totalCount?: number
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
}

// Options interface - captures getItems function type for type extraction
export interface TPaginatedQueryOptions<
  TParams extends SchemaFieldType | undefined = undefined,
  TGetItems extends (
    paginationParams: PaginationParams,
    params: any,
    viewer: any,
  ) => Promise<any[]> | any[] = (
    paginationParams: PaginationParams,
    params: any,
    viewer: any,
  ) => any[],
  TViewer = any,
> {
  params?: TParams
  returns?: SchemaFieldType
  getItems: TGetItems
  getCount: (params: ResolveParamsType<TParams>, viewer: TViewer) => Promise<number> | number
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
  defaultLimit?: number
  maxLimit?: number
}

export function createTPaginatedQuery<
  TParams extends SchemaFieldType | undefined = undefined,
  TGetItems extends (
    paginationParams: PaginationParams,
    params: ResolveParamsType<TParams>,
    viewer: any,
  ) => Promise<any[]> | any[] = (
    paginationParams: PaginationParams,
    params: ResolveParamsType<TParams>,
    viewer: any,
  ) => any[],
  TViewer = any,
>(options: TPaginatedQueryOptions<TParams, TGetItems, TViewer>) {
  // Extract TItem from getItems return type - simple and direct
  type TItem = Awaited<ReturnType<TGetItems>>[number]

  const paginationSchema = getPaginationSchema({
    allowedSorts: options.allowedSorts,
    defaultSortBy: options.defaultSortBy,
    defaultSortType: options.defaultSortType,
    defaultLimit: options.defaultLimit,
    maxLimit: options.maxLimit,
  })
  const userParamsSchema = getUserParamsSchema(options.params)
  const returnsSchema = options.returns ? getSchemaFromAnyOrionForm(options.returns) : undefined

  // Schema for cleaning items array (only used if returns schema is provided)
  const itemsWrapperSchema: Schema | undefined = returnsSchema
    ? {
        items: {type: [returnsSchema] as any},
      }
    : undefined

  type Output = PaginatedResponse<TItem>

  return t.procedure
    .input((val: unknown) => val as PaginatedQueryInput<TParams>)
    .query(async ({ctx, input}): Promise<Output> => {
      try {
        const {action, params: rawUserParams, ...rawPaginationFields} = input

        // Handle getDescription action - doesn't need params validation
        if (action === 'getDescription') {
          return {
            allowedSorts: options.allowedSorts || [],
            defaultSortBy: options.defaultSortBy,
            defaultSortType: options.defaultSortType,
          }
        }

        // Validate and clean pagination fields
        const paginationFields = (await cleanAndValidate(
          paginationSchema,
          rawPaginationFields,
        )) as PaginationFields

        // Validate and clean user params
        const userParams = (await cleanAndValidate(
          userParamsSchema,
          rawUserParams || {},
        )) as ResolveParamsType<TParams>

        const page = paginationFields.page ?? 1
        const limit = paginationFields.limit ?? 20

        // Handle getCount action
        if (action === 'getCount') {
          const totalCount = await options.getCount(userParams, ctx.viewer as TViewer)
          return {totalCount}
        }

        // Handle getItems action
        if (action === 'getItems') {
          const skip = computeSkip(page, limit)
          const {sortBy, sortType} = paginationFields

          // Build sort object
          const sort: {[key: string]: 1 | -1} = {}
          if (sortBy && sortType) {
            sort[sortBy] = sortType === 'asc' ? 1 : -1
          }

          // Build pagination params ready for MongoDB
          const paginationParams: PaginationParams = {skip, limit, sort}

          // Get items directly
          const items = await options.getItems(paginationParams, userParams, ctx.viewer as TViewer)

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

          return {items: cleanedItems}
        }

        throw new Error(`Unknown action: ${action}`)
      } catch (error) {
        throw mapErrorToTRPCError(error as Error)
      }
    })
}
