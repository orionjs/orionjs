import {
  getSchemaFromAnyOrionForm,
  getSchemaModelName,
  isSchemaLike,
  Schema,
  SchemaMetaFieldTypeSingle,
  SchemaNode,
  SchemaWithMetadata,
} from '@orion-js/schema'

export function processModelSchemaKey(schemaNode: SchemaNode): SchemaNode {
  if (!schemaNode) return null

  if (Array.isArray(schemaNode.type)) {
    console.log('processing array', schemaNode.type)
    const processedItem = processModelSchemaKey({
      ...schemaNode,
      type: schemaNode.type[0],
    })

    const type = processedItem.type as SchemaMetaFieldTypeSingle

    return {
      ...processedItem,
      type: [type],
    }
  }

  if (isSchemaLike(schemaNode.type)) {
    return {
      ...schemaNode,
      type: modelToSchema({
        modelSchema: getSchemaFromAnyOrionForm(schemaNode.type) as Schema,
        modelName: getSchemaModelName(schemaNode.type),
      }),
    }
  }

  return schemaNode
}

interface ModelToSchemaOptions {
  modelSchema: Schema
  modelName?: string
  cleanOptions?: any
  validateOptions?: any
}

export function modelToSchema(options: ModelToSchemaOptions): Schema {
  const compiledSchema: SchemaWithMetadata = {}

  if (options.modelName) {
    compiledSchema.__modelName = options.modelName
  }

  if (options.cleanOptions) {
    compiledSchema.__clean = options.cleanOptions
  }

  if (options.validateOptions) {
    compiledSchema.__validate = options.validateOptions
  }

  for (const key in options.modelSchema) {
    if (key.startsWith('__')) {
      compiledSchema[key] = options.modelSchema[key]
      continue
    }
    compiledSchema[key] = processModelSchemaKey(options.modelSchema[key])
  }

  return compiledSchema as Schema
}
