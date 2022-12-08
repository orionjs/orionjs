import getSelector from './getSelector'
import {Collection, FindOne, ModelClassBase} from '../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  const findOne: FindOne<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector<DocumentType>(arguments)
    const item = (await collection.rawCollection.findOne(selector, options)) as DocumentType

    if (!item) return item
    return collection.initItem(item)
  }

  return findOne
}
