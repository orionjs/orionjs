import {OrionCollection} from '../Types'
import getSelector from './getSelector'
import * as MongoDB from 'mongodb'
import clone from 'lodash/clone'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const find: OrionCollection.Find<DocumentType> = (selectorArg, options) => {
    const selector = getSelector(selectorArg)

    const cursor = collection.rawCollection.find(selector, options) as any

    cursor._oldToArray = cursor.toArray

    cursor.toArray = async (): Promise<DocumentType> => {
      const items = await cursor._oldToArray()
      return items.map(item => collection.initItem(item))
    }

    return cursor
  }

  return find
}
