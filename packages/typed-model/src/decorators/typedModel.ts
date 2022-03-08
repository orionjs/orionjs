import {getModelForClass} from '..'
import {MetadataStorage} from '../storage/metadataStorage'

export function TypedModel(): ClassDecorator {
  return target => {
    MetadataStorage.addSchemaMetadata({target})

    // @ts-expect-error this is a trick to make it work in resolvers without having to call getModelForClass
    target.getModel = () => getModelForClass(target)
  }
}
