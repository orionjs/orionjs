import {Model} from '@orion-js/models'
import {Schema} from '@orion-js/schema'
import {cloneDeep, isPlainObject} from 'lodash'
import {CreateCollectionOptions} from '../types'

export function getModel(options: CreateCollectionOptions): Model {
  if (!options.model) return
  return options.model && options.model.getModel ? options.model.getModel() : options.model
}

export function prepareShema(schema: Schema): Schema {
  if (!schema._id) {
    schema._id = {
      type: String
    }
  }
  return schema
}

export function getSchema(options: CreateCollectionOptions, optionsModel?: Model): Schema {
  if (optionsModel) {
    const schema = optionsModel ? cloneDeep(optionsModel.getCleanSchema()) : {}
    return prepareShema(schema)
  }

  // schema is a typed model
  if (options.schema && options.schema.getModel) {
    const model = options.schema.getModel()
    const schema = model ? cloneDeep(model.getCleanSchema()) : {}
    return prepareShema(schema)
  }

  if (options.schema && isPlainObject(options.schema)) {
    return prepareShema(options.schema)
  }
}

export function getSchemaAndModel(options: CreateCollectionOptions): {
  schema: Schema
  model: Model
} {
  const model = getModel(options)
  const schema = getSchema(options, model)

  return {schema, model}
}
