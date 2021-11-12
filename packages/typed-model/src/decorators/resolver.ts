/* eslint-disable @typescript-eslint/ban-types */
import {Resolver} from '@orion-js/resolvers'
import {MetadataStorage} from '../storage/metadataStorage'

export function ResolverProp(options: Resolver): PropertyDecorator {
  return (classDef: Function, propertyKey: string) => {
    MetadataStorage.addResolverMetadata({target: classDef.constructor, propertyKey, options})

    classDef[propertyKey] = options
  }
}
