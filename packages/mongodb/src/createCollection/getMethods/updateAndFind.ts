import {Collection, UpdateAndFind} from '../../types'
import getSelector from './getSelector'
import {wrapErrors} from './wrapErrors'

export default <DocumentType>(collection: Partial<Collection>) => {
  const updateAndFind: UpdateAndFind<DocumentType> = async function (
    selector,
    modifier,
    options = {}
  ) {
    return await wrapErrors(async () => {
      return await collection.findOneAndUpdate(selector, modifier, {
        ...options,
        mongoOptions: {
          ...options.mongoOptions,
          returnDocument: 'after'
        }
      })
    })
  }
  return updateAndFind
}
