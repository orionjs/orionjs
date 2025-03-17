import {Constructor, SchemaFieldType, SchemaNode} from '@orion-js/schema'
import {Model} from '@orion-js/models'
import {CannotDetermineTypeError} from '../errors/CannotDetermineType'

export interface PropOptions extends Omit<SchemaNode, 'type'> {
  type: SchemaFieldType | Constructor<any> | Model | Model[]
}

/**
 * @deprecated use schema with InferSchemaType<schema as const> instead
 */
export function Prop(options: PropOptions) {
  return (_target: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    if (!options?.type) {
      throw new CannotDetermineTypeError(propertyKey)
    }

    context.metadata[`_prop:${propertyKey}`] = options
  }
}
