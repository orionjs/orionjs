import {getModelForClass} from '..'
import {MetadataStorage, TypedModelOptions} from '../storage/metadataStorage'

/**
 * @deprecated Please use @TypedSchema instead
 */
export function TypedModel(options: TypedModelOptions = {}): ClassDecorator {
  return target => {
    MetadataStorage.addSchemaMetadata({target, options})

    // @ts-expect-error this is a trick to make it work in resolvers without having to call getModelForClass
    target.getModel = () => getModelForClass(target)
  }
}
