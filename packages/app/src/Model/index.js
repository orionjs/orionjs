import initItem from './initItem'
import isArray from 'lodash/isArray'

export default class Model {
  constructor({name, schema, resolvers}) {
    this.name = name
    this.__isModel = true
    this._schema = schema
    this.resolvers = resolvers
  }

  initItem(data) {
    return initItem(this, data)
  }

  set schema(schema) {
    this._schema = schema
  }

  get schema() {
    const keys = Object.keys(this._schema)
    for (const key of keys) {
      if (isArray(this._schema[key].type)) {
        if (this._schema[key].type[0] instanceof Model) {
          this._schema[key].type[0] = this._schema[key].type[0].schema
        }
      }
      if (this._schema[key].type instanceof Model) {
        this._schema[key].type = this._schema[key].type.schema
      }
    }
    return {
      ...this._schema,
      __model: this
    }
  }

  get staticFields() {
    const schema = this.schema
    if (!schema) return []
    const keys = Object.keys(this.schema).filter(key => !key.startsWith('__'))

    return keys
      .map(key => {
        const field = schema[key]
        return {
          ...field,
          key
        }
      })
      .filter(field => !field.private)
  }

  get dynamicFields() {
    if (!this.resolvers) return []
    const keys = Object.keys(this.resolvers)

    return keys
      .map(key => {
        const resolver = this.resolvers[key]
        return {
          ...resolver,
          key
        }
      })
      .filter(resolver => !resolver.private)
  }
}
