import initItem from './initItem'
import includes from 'lodash/includes'
import clone from 'lodash/clone'
import resolveParam from './resolveParam'
import {validate, clean} from '@orion-js/schema'
import checkResolvedResolvers from './checkResolvedResolvers'
import modelToSchema from './modelToSchema'

export default class Model {
  constructor({name, validate, clean, schema, resolvers, getSchema = f => f}) {
    this.name = name
    this.__isModel = true
    this.resolvedSchema = 'unresolved'
    this._schema = schema
    this.resolvedResolvers = 'unresolved'
    this._resolvers = resolvers
    this._validate = validate
    this._clean = clean
    this._getSchema = getSchema
  }

  initItem(data) {
    return initItem(this, data)
  }

  get resolvers() {
    if (this.resolvedResolvers !== 'unresolved') return this.resolvedResolvers
    this.resolvedResolvers = resolveParam(this._resolvers)
    checkResolvedResolvers(this.resolvedResolvers)
    return this.resolvedResolvers
  }

  set resolvers(resolvers) {
    this._resolvers = resolvers
    this.resolvedResolvers = 'unresolved'
  }

  get schema() {
    const schema = this.getSchema()
    if (!schema) return
    return modelToSchema.call(this, schema)
  }

  set schema(schema) {
    this._schema = schema
    this.resolvedSchema = 'unresolved'
  }

  getSchema() {
    if (this.resolvedSchema !== 'unresolved') return this.resolvedSchema
    const schema = resolveParam(this._schema)

    this.resolvedSchema = this._getSchema(schema)
    return this.resolvedSchema
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

  clone({
    name = this.name,
    omitFields = [],
    pickFields,
    mapFields = f => f,
    clean = this._clean,
    validate = this._validate,
    extendSchema = {},
    extendResolvers = {}
  }) {
    const getSchema = function getSchema(_schema) {
      const schema = {}

      const keys = Object.keys(_schema)
        .filter(key => !includes(omitFields, key))
        .filter(key => {
          if (!pickFields) return true
          return includes(pickFields, key)
        })
      for (const key of keys) {
        const field = clone(_schema[key])
        schema[key] = mapFields(field, key)
      }
      return schema
    }

    let resolvers = this._resolvers

    if (extendResolvers) {
      const prevResolvers = this._resolvers
      resolvers = () => {
        return {
          ...resolveParam(prevResolvers),
          ...extendResolvers
        }
      }
    }

    let schema = this.getSchema(this._schema)

    if (extendSchema) {
      const prevSchema = schema
      schema = () => {
        return {
          ...resolveParam(prevSchema),
          ...extendSchema
        }
      }
    }

    return new Model({
      name,
      schema,
      getSchema,
      resolvers,
      clean,
      validate
    })
  }

  extend({schema = {}, resolvers = {}}) {
    const newSchema = {
      ...this.schema,
      ...schema
    }

    const newResolvers = {
      ...this.resolvers,
      ...resolvers
    }

    this.schema = newSchema
    this.resolvers = newResolvers

    return this
  }

  async validate(doc, ...options) {
    const schema = this.schema
    return await validate(schema, doc, ...options)
  }

  async clean(doc, ...options) {
    const schema = this.schema
    return await clean(schema, doc, ...options)
  }
}
