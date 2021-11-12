import getSelector from './getSelector'
import {Collection, FindOne} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const findOne: FindOne<DocumentType> = async function (selectorArg, options) {
    const selector = getSelector(arguments)
    const item = await collection.rawCollection.findOne(selector, options)

    if (!item) return item
    return collection.initItem(item)
  }

  return findOne
}
