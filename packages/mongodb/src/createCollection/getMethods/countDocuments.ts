import getSelector from './getSelector'
import {Collection, CountDocuments, DeleteOne} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const func: CountDocuments<DocumentType> = async function (selectorArg, options) {
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.countDocuments(selector, options)

    return result
  }

  return func
}
