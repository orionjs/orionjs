import {Collection, ModelClassBase, UpdateAndFind} from '../../types'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const updateAndFind: UpdateAndFind<DocumentType> = async (selector, modifier, options = {}) => {
    await collection.connectionPromise
    return await wrapErrors(async () => {
      const result = await collection.findOneAndUpdate(selector, modifier, {
        ...options,
        mongoOptions: {
          ...options.mongoOptions,
          returnDocument: 'after',
        },
      })
      return result as DocumentType
    })
  }
  return updateAndFind
}
