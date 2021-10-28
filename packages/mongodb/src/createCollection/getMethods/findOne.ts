import getSelector from './getSelector'
import {OrionCollection} from '../Types'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const findOne: OrionCollection.FindOne<DocumentType> = async (selectorArg, options) => {
    const selector = getSelector(selectorArg)
    const item = await collection.rawCollection.findOne(selector, options)

    if (!item) return item
    return collection.initItem(item)
  }

  return findOne
}
