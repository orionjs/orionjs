import { Constructor, SchemaMetaFieldType, SchemaNode } from '@orion-js/schema'
import { Model } from '@orion-js/models'
import { CannotDetermineTypeError } from '../errors/CannotDetermineType'

export interface PropOptions extends Omit<SchemaNode, 'type'> {
  type: SchemaMetaFieldType | Constructor<any> | Model | Model[]
}

export function Prop(options: PropOptions) {
  return function (_target: any, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);

    if (!options.type) {
      throw new CannotDetermineTypeError(propertyKey)
    }

    context.metadata[`_prop:${propertyKey}`] = options
  }
}
