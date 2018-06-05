import clone from 'lodash/clone'
import isArray from 'lodash/isArray'

export default function(resolverParams, params, options, viewer) {
  const schema = {}

  for (const key of Object.keys(resolverParams)) {
    const field = clone(resolverParams[key])
    const isArrayOfModel = isArray(field.type) && field.type[0].__isModel

    if (isArrayOfModel) {
      field.type = [field.type[0].schema]
    } else if (field.type.__isModel) {
      field.type = field.type.schema
    }

    schema[key] = field
  }

  return schema
}
