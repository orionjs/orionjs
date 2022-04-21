import {ModelResolver, ModelResolverResolve} from '@orion-js/resolvers'
import {MetadataStorage} from '../storage/metadataStorage'

/**
 * @deprecated Please use a @TypedSchema and a @Model a @ModelResolver instead
 */
export function ResolverProp(options: ModelResolver<ModelResolverResolve>): PropertyDecorator {
  return (classDef: any, propertyKey: string) => {
    MetadataStorage.addResolverMetadata({target: classDef.constructor, propertyKey, options})

    classDef[propertyKey] = options
  }
}
