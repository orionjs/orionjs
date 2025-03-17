import {Collection, ModelClassBase, UpdateAndFind} from '../../types'
import getSelector from './getSelector'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const updateAndFind: UpdateAndFind<DocumentType> = async function (
    selector,
    modifier,
    options = {},
  ) {
    await collection.connectionPromise
    return await wrapErrors(async () => {
      return await collection.findOneAndUpdate(selector, modifier, {
        ...options,
        mongoOptions: {
          ...options.mongoOptions,
          returnDocument: 'after',
        },
      })
    })
  }
  return updateAndFind
}
