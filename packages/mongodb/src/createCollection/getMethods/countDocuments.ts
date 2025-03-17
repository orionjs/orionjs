import getSelector from './getSelector'
import {Collection, CountDocuments, DeleteOne, ModelClassBase} from '../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const func: CountDocuments<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.countDocuments(selector, options)

    return result
  }

  return func
}
