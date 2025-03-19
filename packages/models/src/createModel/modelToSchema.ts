import {
  getSchemaFromAnyOrionForm,
  getSchemaModelName,
  isSchemaLike,
  Schema,
  SchemaMetaFieldTypeSingle,
  SchemaNode,
  SchemaWithMetadata,
} from '@orion-js/schema'
import {ModelResolversMap} from '../types'
import {isEmpty} from 'rambdax'

export function processModelSchemaKey(schemaNode: SchemaNode): SchemaNode {
  if (!schemaNode) return null

  if (Array.isArray(schemaNode.type)) {
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
  resolvers?: ModelResolversMap
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

  if (options.resolvers && !isEmpty(options.resolvers)) {
    compiledSchema.__resolvers = options.resolvers
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
