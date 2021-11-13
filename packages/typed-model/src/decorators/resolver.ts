/* eslint-disable @typescript-eslint/ban-types */
import {ModelResolver} from '@orion-js/resolvers'
import {MetadataStorage} from '../storage/metadataStorage'

export function ResolverProp(options: ModelResolver): PropertyDecorator {
  return (classDef: Function, propertyKey: string) => {
    MetadataStorage.addResolverMetadata({target: classDef.constructor, propertyKey, options})

    classDef[propertyKey] = options
  }
}
