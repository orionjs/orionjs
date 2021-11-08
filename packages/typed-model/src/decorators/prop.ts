/* eslint-disable @typescript-eslint/ban-types */
import {Constructor, SchemaMetaFieldType, SchemaNode} from '@orion-js/schema'
import {MetadataStorage} from '../storage/metadataStorage'
import 'reflect-metadata'
import {CannotDetermineTypeError, CannotUseArrayError} from '../errors'
import {isClass} from '../utils/isClass'
import {Model} from '@orion-js/models'

export interface SchemaNodeForClasses extends Omit<SchemaNode, 'type'> {
  type: SchemaMetaFieldType | Constructor<any> | Model | Model[]
}

export type PropOptions = Partial<SchemaNodeForClasses>

export function Prop(options: PropOptions = {}): PropertyDecorator {
  return (classDef: Function, propertyKey: string) => {
    const schemaName = classDef.constructor?.name

    if (!options.type) {
      const type = Reflect.getMetadata('design:type', classDef, propertyKey)

      if (isClass(type) || type === Object) {
        throw new CannotDetermineTypeError(schemaName, propertyKey)
      }

      if (type === Array) {
        throw new CannotUseArrayError(schemaName, propertyKey)
      }

      if (type) {
        options.type = type
      } else {
        throw new CannotDetermineTypeError(schemaName, propertyKey)
      }
    }

    MetadataStorage.addPropMetadata({target: classDef.constructor, propertyKey, options})

    classDef[propertyKey] = options
  }
}
