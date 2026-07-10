import {clone} from '@orion-js/helpers'
import {Schema} from '@orion-js/schema'
import {type} from 'rambdax'
import {CreateCollectionOptions} from '../types'

// @ts-expect-error polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
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
  const schemaOption = options.schema as any

  if (schemaOption[Symbol.metadata]?._getModel) {
    return schemaOption[Symbol.metadata]._getModel().getSchema()
  }

  // schema is a model
  if (schemaOption.getSchema) {
    const schema = schemaOption.getSchema()
    return prepareShema(schema)
  }

  // schema is a typed model
  if (schemaOption.getModel) {
    const model = schemaOption.getModel()
    const schema = model ? clone(model.getSchema()) : {}
    return prepareShema(schema)
  }

  if (type(schemaOption) === 'Object') {
    return prepareShema(schemaOption as Schema)
  }
}
