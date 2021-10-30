import {Resolver} from '@orion-js/resolvers'
import {MetadataStorage} from '../storage/metadataStorage'

export function Resolver(options: Resolver): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const schemaName = target.constructor?.name

    MetadataStorage.addResolverMetadata({schemaName, propertyKey, options})
  }
}
