import {Collection, Find, ModelClassBase} from '../../types'
import getSelector from './getSelector'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  const find: Find<DocumentType> = function (selectorArg, options) {
    const selector = getSelector(arguments)

    const cursor = collection.rawCollection.find(selector, options) as any

    cursor._oldToArray = cursor.toArray

    cursor.toArray = async (): Promise<DocumentType> => {
      await collection.connectionPromise
      const items = await cursor._oldToArray()
      return items.map(item => collection.initItem(item))
    }

    return cursor
  }

  return find
}
