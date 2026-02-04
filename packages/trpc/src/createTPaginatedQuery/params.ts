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

// Schema for pagination fields (top-level, not inside params)
export const paginationFieldsSchema = {
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

export function getPaginationSchema(options: PaginatedParamsOptions): Schema {
  const {allowedSorts, defaultSortBy, defaultSortType, defaultLimit, maxLimit} = options

  const schema: any = clone({...paginationFieldsSchema})

  if (defaultLimit) {
    schema.limit.defaultValue = defaultLimit
  }

  if (maxLimit) {
    schema.limit.max = maxLimit
  }

  if (allowedSorts?.length) {
    schema.sortBy.allowedValues = allowedSorts
    if (defaultSortBy) {
      schema.sortBy.defaultValue = defaultSortBy
    }
    if (defaultSortType) {
      schema.sortType.defaultValue = defaultSortType
    }
  } else {
    delete schema.sortBy
    delete schema.sortType
  }

  return schema
}

export function getUserParamsSchema(params?: SchemaFieldType): Schema {
  return params ? (getSchemaFromAnyOrionForm(params) as Schema) : {}
}
