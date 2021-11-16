import isArray from 'lodash/isArray'
import cloneDeep from 'lodash/cloneDeep'
import {Model} from '..'

export default function (schema: any, model?: Model) {
  schema = cloneDeep(schema)
  const keys = Object.keys(schema)

  for (const key of keys) {
    if (isArray(schema[key].type)) {
      if (schema[key].type[0].__isModel) {
        schema[key].type[0] = schema[key].type[0].getSchema()
      }
    }

    if (schema[key].type && schema[key].type.__isModel) {
      schema[key].type = schema[key].type.getSchema()
    }
  }

  if (!model) return schema

  return {
    ...schema,
    __model: model
  }
}
