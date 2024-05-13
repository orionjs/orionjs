import isArray from 'lodash/isArray'
import {Model, ModelSchema} from '..'
import {Schema, SchemaMetaFieldType, SchemaNode, validate} from '@orion-js/schema'
import {lowerFirst} from 'lodash'

function isModelSchema(type: Model | [Model] | SchemaMetaFieldType): type is Model {
  return type && typeof type === 'object' && '__isModel' in type
}

function isModelArraySchema(type: Model | [Model] | SchemaMetaFieldType): type is [Model] {
  return type && isArray(type) && typeof type[0] === 'object' && '__isModel' in type[0]
}

export function modelToSchema(modelSchema: ModelSchema, {cleanSchema = true} = {}): Schema {
  const compiledSchema: Schema = {}

  for (const key in modelSchema) {
    if (key.startsWith('__')) continue

    const fieldSchema = modelSchema[key]
    let currNode: SchemaNode

    if (isModelSchema(fieldSchema.type)) {
      currNode = {
        ...fieldSchema,
        type: cleanSchema ? fieldSchema.type.getCleanSchema() : fieldSchema.type.getSchema()
      }
    } else if (isModelArraySchema(fieldSchema.type)) {
      currNode = {
        ...fieldSchema,
        type: cleanSchema
          ? [fieldSchema.type[0].getCleanSchema()]
          : [fieldSchema.type[0].getSchema()]
      }
    } else {
      currNode = {...fieldSchema, type: fieldSchema.type}
    }

    compiledSchema[key] = currNode
  }

  return compiledSchema
}

export function modelToSchemaWithModel(modelSchema: ModelSchema, model?: Model) {
  const schema = modelToSchema(modelSchema, {cleanSchema: !model})

  if (!model) return schema

  return {
    ...schema,
    __model: model
  }
}

export function modelToSchemaClean(modelSchema: ModelSchema) {
  const schema = modelToSchema(modelSchema, {cleanSchema: true})
  return schema
}
