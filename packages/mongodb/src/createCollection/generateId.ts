import {generateId, generateUUID} from '@orion-js/helpers'
import {FieldType, Schema} from '@orion-js/schema'
import {ObjectId} from 'bson'
import {CreateCollectionOptions, ModelClassBase} from '..'

const getIdGenerator = <DocumentType extends ModelClassBase>(
  options: CreateCollectionOptions,
): (() => DocumentType['_id']) => {
  const schema = options.schema as Schema | undefined
  if (!options.idPrefix && schema?._id) {
    const idField = schema._id.type as FieldType
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
