import isArray from 'lodash/isArray'
import {OrionModels} from './ModelTypes'
import cloneDeep from 'lodash/cloneDeep'

export default function (schema: any) {
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

  return schema
}
