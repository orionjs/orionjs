import {OrionResolvers} from '@orion-js/resolvers'
import {MetadataStorage} from '../storage/metadataStorage'

export type ResolverOptions = OrionResolvers.Resolver

export function Resolver(options: ResolverOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const schemaName = target.constructor?.name

    MetadataStorage.addResolverMetadata({schemaName, propertyKey, options})
  }
}
