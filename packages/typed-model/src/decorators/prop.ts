import {Constructor, SchemaMetaFieldType, SchemaNode} from '@orion-js/schema'
import {MetadataStorage} from '../storage/metadataStorage'
import {Model} from '@orion-js/models'
import {CannotDetermineTypeError} from '../errors/CannotDetermineType'
import {CannotUseArrayError} from '../errors/CannotUseArray'

export interface SchemaNodeForClasses extends Omit<SchemaNode, 'type'> {
  type: SchemaMetaFieldType | Constructor<any> | Model | Model[]
}

export function Prop(options: SchemaNodeForClasses): PropertyDecorator {
  return (classDef: Object, propertyKey: string | symbol) => {
    const schemaName = classDef.constructor?.name || 'Unknown'
    const propKey = String(propertyKey)
    
    if (!options.type) {
      throw new CannotDetermineTypeError(schemaName, propKey)
    }

    // Check if it's an array type
    if (Array.isArray(options.type) && options.type.length === 0) {
      throw new CannotUseArrayError(schemaName, propKey)
    }

    MetadataStorage.addPropMetadata({target: classDef.constructor, propertyKey: propKey, options})

    // @ts-ignore: Property assignment
    classDef[propertyKey] = options
  }
}
