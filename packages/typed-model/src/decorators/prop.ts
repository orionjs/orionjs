import {SchemaMetaFieldType, SchemaNode, SchemaNodeType} from '@orion-js/schema'
import {MetadataStorage} from '../storage/metadataStorage'
import 'reflect-metadata'
import {CannotDetermineTypeError, CannotUseArrayError} from '../errors'
import {isClass} from '../utils/isClass'
import {Constructor} from '../utils/interfaces'
import {Model} from '@orion-js/models'

export interface SchemaNodeForClasses<TClass, TSubschemaType = SchemaNodeType>
  extends Omit<SchemaNode, 'type'> {
  type: SchemaMetaFieldType<TSubschemaType> | Constructor<TClass> | Model
}

export type PropOptions<TClass = any, TSubschemaType = SchemaNodeType> = Partial<
  SchemaNodeForClasses<TClass, TSubschemaType>
>

export const asPropOptions = <TClass = any, TSubschemaType = SchemaNodeType>(
  propOptions: SchemaNodeForClasses<TClass, TSubschemaType>
) => propOptions

export function Prop(options: PropOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const schemaName = target.constructor?.name

    if (!options.type) {
      const type = Reflect.getMetadata('design:type', target, propertyKey)

      if (isClass(type) || type === Object) {
        throw new CannotDetermineTypeError(schemaName, propertyKey as string)
      }

      if (type === Array) {
        throw new CannotUseArrayError(schemaName, propertyKey as string)
      }

      if (type) {
        options.type = type
      } else {
        throw new CannotDetermineTypeError(schemaName, propertyKey as string)
      }
    }

    MetadataStorage.addPropMetadata({schemaName, propertyKey, options})
  }
}
