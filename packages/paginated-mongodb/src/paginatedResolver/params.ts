import {Schema} from '@orion-js/schema'
import {omit} from 'lodash'
import {PaginatedResolverOpts} from '.'

type OptionsKeys = 'params' | 'allowedSorts' | 'defaultSortBy' | 'defaultSortType'

export default function getParams(options: Pick<PaginatedResolverOpts, OptionsKeys>) {
  const {params, allowedSorts, defaultSortBy, defaultSortType} = options
  const schema: Schema = {
    page: {
      type: 'integer',
      defaultValue: 1,
      min: 1
    },
    limit: {
      type: 'integer',
      defaultValue: 0,
      min: 0,
      max: 200
    }
  }

  if (allowedSorts && allowedSorts.length) {
    schema.sortBy = {
      type: String,
      allowedValues: allowedSorts,
      optional: true
    }
    if (defaultSortBy) {
      schema.sortBy.defaultValue = defaultSortBy
    }
    schema.sortType = {
      type: String,
      allowedValues: ['asc', 'desc'],
      optional: true
    }
    if (defaultSortType) {
      schema.sortType.defaultValue = defaultSortType
    }
  }

  if (params) {
    if (typeof params === 'function' && params.getModel && params.__schemaId) {
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
