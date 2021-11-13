import isArray from 'lodash/isArray'
import isPlainObject from 'lodash/isPlainObject'
import isNil from 'lodash/isNil'
import {ModelResolversMap} from '../types'

interface InitItemOptions {
  name: string
  schema: any
  resolvers: ModelResolversMap
}

export default function ({schema, resolvers, name}: InitItemOptions, item: any): any {
  if (isNil(item)) {
    return item
  }

  if (!isPlainObject(item)) {
    console.warn(`When initializing an item in ${name} received a non object value`, item)
    return
  }

  if (resolvers) {
    for (const key of Object.keys(resolvers)) {
      const resolver = resolvers[key]
      item[key] = function (params: any, viewer: any) {
        return resolver.execute({
          parent: item,
          params,
          viewer
        })
      }
    }
  }

  if (schema) {
    const keys = Object.keys(schema).filter(key => !key.startsWith('__'))
    for (const key of keys) {
      const fieldSchema = schema[key]
      if (!fieldSchema.type) continue
      const fieldModel = isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type
      if (!fieldModel.__model) continue
      if (!item[key]) continue
      if (isArray(fieldSchema.type)) {
        if (!isArray(item[key])) continue
        item[key] = item[key].map(item => fieldModel.__model.initItem(item))
      } else {
        item[key] = fieldModel.__model.initItem(item[key])
      }
    }
  }

  return item
}
