import {Collection, UpdateAndFind} from '../../types'
import getSelector from './getSelector'

export default <DocumentType>(collection: Partial<Collection>) => {
  const updateAndFind: UpdateAndFind<DocumentType> = async function (
    selector,
    modifier,
    options = {}
  ) {
    return collection.findOneAndUpdate(selector, modifier, {
      ...options,
      mongoOptions: {
        ...options.mongoOptions,
        returnDocument: 'after'
      }
    })
  }
  return updateAndFind
}
