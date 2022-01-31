import {Schema} from '@orion-js/schema'
import clone from 'lodash/clone'
import isArray from 'lodash/isArray'

export default function (resolverParams: any) {
  const schema: Schema = {}

  for (const key of Object.keys(resolverParams)) {
    const field = clone(resolverParams[key])
    const isArrayOfModel = isArray(field.type) && field.type[0].__isModel

    if (isArrayOfModel) {
      field.type = [field.type[0].getSchema()]
    } else if (field.type.__isModel) {
      field.type = field.type.getSchema()
    }

    schema[key] = field
  }

  return schema
}
