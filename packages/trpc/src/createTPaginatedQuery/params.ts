import {clone} from '@orion-js/helpers'
import {getSchemaFromAnyOrionForm, Schema, SchemaFieldType} from '@orion-js/schema'

export interface PaginatedParamsOptions {
  params?: SchemaFieldType
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
  defaultLimit?: number
  maxLimit?: number
}

export const paginatedBaseParamsSchema = {
  page: {
    type: 'integer',
    defaultValue: 1,
    optional: true,
    min: 1,
  },
  limit: {
    type: 'integer',
    defaultValue: 20,
    optional: true,
    min: 0,
    max: 200,
  },
  sortBy: {
    type: String,
    optional: true,
  },
  sortType: {
    type: String,
    allowedValues: ['asc', 'desc'],
    optional: true,
  },
} as const

export function getPaginatedParams<const TDefinedParams extends Schema>(
  options: PaginatedParamsOptions,
): typeof paginatedBaseParamsSchema & TDefinedParams {
  const {params, allowedSorts, defaultSortBy, defaultSortType, defaultLimit, maxLimit} = options
  const paramsSchema = (params ? getSchemaFromAnyOrionForm(params) : {}) as Schema

  const schema = clone({
    ...paginatedBaseParamsSchema,
    ...(paramsSchema || {}),
  })

  if (defaultLimit) {
    // @ts-expect-error
    schema.limit.defaultValue = defaultLimit
  }

  if (maxLimit) {
    // @ts-expect-error
    schema.limit.max = maxLimit
  }

  if (allowedSorts?.length) {
    // @ts-expect-error
    schema.sortBy.allowedValues = allowedSorts
    if (defaultSortBy) {
      // @ts-expect-error
      schema.sortBy.defaultValue = defaultSortBy
    }
    if (defaultSortType) {
      // @ts-expect-error
      schema.sortType.defaultValue = defaultSortType
    }
  } else {
    delete schema.sortBy
    delete schema.sortType
  }

  return schema as any
}
