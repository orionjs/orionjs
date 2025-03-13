import getSelector from './getSelector'
import {Collection, FindOne, ModelClassBase} from '../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const findOne: FindOne<DocumentType> = async (...args: any[]) => {
    const options = args[1]
    await collection.connectionPromise
    const selector = getSelector<DocumentType>(args)
    const item = (await collection.rawCollection.findOne(selector, options)) as DocumentType

    if (!item) return item
    return item
  }

  return findOne
}
