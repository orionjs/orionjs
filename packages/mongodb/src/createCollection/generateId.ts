import {generateId, generateUUID} from '@orion-js/helpers'
import {ObjectId} from 'bson'
import {CreateCollectionOptions, ModelClassBase} from '..'
import {FieldType} from '@orion-js/schema'

const getIdGenerator = <DocumentType extends ModelClassBase>(
  options: CreateCollectionOptions,
): (() => DocumentType['_id']) => {
  if (!options.idPrefix && options?.schema?._id) {
    const idField = options.schema._id.type as FieldType
    if (idField.name?.startsWith('typedId:')) {
      return () => {
        return (idField as any).generateId()
      }
    }
  }

  if (options.idPrefix || options.idGeneration === 'uuid') {
    return () => {
      const prefix = options.idPrefix || ''
      const random = generateUUID()
      return `${prefix}${random}`
    }
  }

  if (options.idGeneration === 'random') {
    return () => {
      const prefix = options.idPrefix || ''
      const random = generateId()
      return `${prefix}${random}`
    }
  }

  return () => {
    const id = new ObjectId()

    return id.toString()
  }
}

export default getIdGenerator
