import {getSchemaFromAnyOrionForm, Schema} from '@orion-js/schema'
import {PaginatedResolverOpts} from '.'
import {clone} from '@orion-js/helpers'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

type OptionsKeys = 'params' | 'allowedSorts' | 'defaultSortBy' | 'defaultSortType'

export const paginatedResolverBaseParamsSchema = {
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

export function getPaginatedResolverParams<const TDefinedParams extends Schema>(
  options: Pick<PaginatedResolverOpts, OptionsKeys>,
): typeof paginatedResolverBaseParamsSchema & TDefinedParams {
  const {params, allowedSorts, defaultSortBy, defaultSortType} = options
  const paramsSchema = (params ? getSchemaFromAnyOrionForm(params) : {}) as Schema

  const schema = clone({
    ...paginatedResolverBaseParamsSchema,
    ...(paramsSchema || {}),
  })

  if (allowedSorts?.length) {
    // @ts-ignore
    schema.sortBy.allowedValues = allowedSorts
    if (defaultSortBy) {
      // @ts-ignore
      schema.sortBy.defaultValue = defaultSortBy
    }
    if (defaultSortType) {
      // @ts-ignore
      schema.sortType.defaultValue = defaultSortType
    }
  } else {
    delete schema.sortBy
    delete schema.sortType
  }

  return schema as any
}
