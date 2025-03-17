import {Schema} from '@orion-js/schema'
import {type} from 'rambdax'
import {clone} from '@orion-js/helpers'
import {CreateCollectionOptions} from '../types'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export function prepareShema(schema: Schema): Schema {
  if (!schema._id) {
    schema._id = {
      type: String,
    }
  }
  return schema
}

export function getSchema(options: CreateCollectionOptions): Schema {
  if (!options.schema) return

  if (options.schema[Symbol.metadata]?._getModel) {
    return options.schema[Symbol.metadata]._getModel().getSchema()
  }

  // schema is a model
  if (options.schema.getSchema) {
    const schema = options.schema.getSchema()
    return prepareShema(schema)
  }

  // schema is a typed model
  if (options.schema.getModel) {
    const model = options.schema.getModel()
    const schema = model ? clone(model.getSchema()) : {}
    return prepareShema(schema)
  }

  if (type(options.schema) === 'Object') {
    return prepareShema(options.schema)
  }
}
