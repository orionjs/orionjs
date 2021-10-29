import {MetadataStorage} from '../storage/metadataStorage'

export function Schema(): ClassDecorator {
  return target => {
    MetadataStorage.addSchemaMetadata({
      schemaName: target.name
    })
  }
}
