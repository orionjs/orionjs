import {Schema} from '@orion-js/schema'
import {omit} from 'lodash'
import {PaginatedResolverOpts} from '.'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

type OptionsKeys = 'params' | 'allowedSorts' | 'defaultSortBy' | 'defaultSortType'

export default function getParams(options: Pick<PaginatedResolverOpts, OptionsKeys>) {
  const {params, allowedSorts, defaultSortBy, defaultSortType} = options
  const schema: Schema = {
    page: {
      type: 'integer',
      defaultValue: 1,
      min: 1,
    },
    limit: {
      type: 'integer',
      defaultValue: 0,
      min: 0,
      max: 200,
    },
  }

  if (allowedSorts?.length) {
    schema.sortBy = {
      type: String,
      allowedValues: allowedSorts,
      optional: true,
    }
    if (defaultSortBy) {
      schema.sortBy.defaultValue = defaultSortBy
    }
    schema.sortType = {
      type: String,
      allowedValues: ['asc', 'desc'],
      optional: true,
    }
    if (defaultSortType) {
      schema.sortType.defaultValue = defaultSortType
    }
  }

  if (params) {
    if (params[Symbol.metadata]?._getModel) {
      const modelSchema = params[Symbol.metadata]._getModel().getCleanSchema()
      Object.assign(schema, omit(modelSchema, '__model'))
    } else if (typeof params === 'function' && params.getModel && params.__schemaId) {
      const modelSchema = params.getModel().getSchema()
      Object.assign(schema, omit(modelSchema, '__model'))
    } else if (params.__isModel) {
      const modelSchema = params.getSchema()
      Object.assign(schema, omit(modelSchema, '__model'))
    } else {
      Object.assign(schema, params)
    }
  }

  return schema
}
