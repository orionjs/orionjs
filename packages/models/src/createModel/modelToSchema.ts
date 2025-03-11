import { isPlainObject, omit } from 'lodash'
import { Model, ModelSchema, ModelsSchemaNode } from '..'
import { Schema, SchemaMetaFieldType, SchemaMetaFieldTypeSingle, SchemaNode, validate } from '@orion-js/schema'

function isModelSchema(type: Model | [Model] | SchemaMetaFieldType): type is Model {
  return type && typeof type === 'object' && '__isModel' in type
}

type ModelSchemaWithModel = ModelsSchemaNode & { __model?: Model }

export function processModelSchemaKey(modelSchema: ModelSchemaWithModel, clean?: boolean): SchemaNode & { __model?: Model } {
  if (Array.isArray(modelSchema.type)) {
    const processedItem = processModelSchemaKey({
      ...modelSchema,
      type: modelSchema.type[0],
      __model: (modelSchema.type[0] as any).__model
    }, clean)

    const type = processedItem.type as SchemaMetaFieldTypeSingle

    return {
      ...processedItem,
      type: [type],
      __model: clean ? undefined : processedItem.__model
    }
  }

  if (isModelSchema(modelSchema.type)) {
    const model = modelSchema.type
    return {
      ...modelSchema,
      type: clean ? model.getCleanSchema() : model.getSchema(),
      __model: clean ? undefined : model
    }
  }

  if ((modelSchema as any).__model) {
    const model = (modelSchema as any).__model as Model
    return {
      ...clean ? omit(modelSchema, ['__model']) : modelSchema,
      type: clean ? model.getCleanSchema() : model.getSchema(),
      __model: clean ? undefined : model
    }
  }

  if (isPlainObject(modelSchema.type)) {
    return {
      ...modelSchema,
      type: modelToSchema(modelSchema.type as ModelSchema, clean),
    }
  }

  return modelSchema as SchemaNode
}

export function modelToSchema(modelSchema: ModelSchema, clean?: boolean): Schema {
  const compiledSchema: Schema = {}

  for (const key in modelSchema) {
    if (key.startsWith('__')) continue
    compiledSchema[key] = processModelSchemaKey(modelSchema[key], clean)
  }

  return compiledSchema
}

export function modelToSchemaWithModel(modelSchema: ModelSchema, model?: Model) {
  const schema = modelToSchema(modelSchema, !model)

  if (!model) {
    return schema
  }

  return {
    ...schema,
    __model: model
  }
}

export function modelToSchemaClean(modelSchema: ModelSchema) {
  return modelToSchema(modelSchema, true)
}
