import {omit} from 'rambdax'
import {internal_getModelForClassFromMetadata} from '../factories'
import {TypedSchemaOptions} from '../storage/metadataStorage'
import {Model} from '@orion-js/models'
import {PropOptions} from './prop'

/**
 * @deprecated use schema with InferSchemaType<schema as const> instead
 */
export function TypedSchema(options: TypedSchemaOptions = {}) {
  return (_target: any, context: ClassDecoratorContext<any>) => {
    context.metadata._isTypedSchema = true
    context.metadata._modelName = options.name || context.name
    context.metadata._modelOptions = omit('name', options)
    context.metadata._getModel = () => {
      return internal_getModelForClassFromMetadata(
        context.metadata as SchemaFromTypedSchemaMetadata,
      )
    }
  }
}

export type SchemaFromTypedSchemaMetadata = {
  _isTypedSchema: true
  _modelName: string
  _modelOptions: TypedSchemaOptions
  _getModel: () => Model
  [key: `_prop:${string}`]: PropOptions
}
