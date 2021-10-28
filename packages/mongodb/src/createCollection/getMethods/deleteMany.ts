import getSelector from './getSelector'
import {OrionCollection} from '../Types'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const func: OrionCollection.DeleteMany<DocumentType> = async (selectorArg, options) => {
    const selector = getSelector(selectorArg)
    const result = await collection.rawCollection.deleteMany(selector, options)

    return result
  }

  return func
}
