import {getModelForClass} from '..'
import {MetadataStorage} from '../storage/metadataStorage'

export function TypedModel(): ClassDecorator {
  return target => {
    MetadataStorage.addSchemaMetadata({target})

    // @ts-expect-error
    target.getModel = () => getModelForClass(target)
  }
}
