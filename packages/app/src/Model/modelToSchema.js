import isArray from 'lodash/isArray'

export default function(schema) {
  const keys = Object.keys(schema)
  for (const key of keys) {
    if (isArray(schema[key].type)) {
      if (schema[key].type[0].__isModel) {
        schema[key].type[0] = schema[key].type[0].schema
      }
    }
    if (schema[key].type.__isModel) {
      schema[key].type = schema[key].type.schema
    }
  }

  if (!this) return schema

  return {
    ...schema,
    __model: this,
    __validate: this._validate,
    __clean: this._clean
  }
}
