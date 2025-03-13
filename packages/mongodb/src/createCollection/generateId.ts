import {generateId, generateUUID} from '@orion-js/helpers'
import {ObjectId} from 'bson'
import {CreateCollectionOptions, ModelClassBase} from '..'

const getIdGenerator = <DocumentType extends ModelClassBase>(
  options: CreateCollectionOptions,
): (() => DocumentType['_id']) => {
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
