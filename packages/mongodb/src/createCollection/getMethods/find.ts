import {OrionCollection} from '../Types'
import getSelector from './getSelector'

export default (collection: OrionCollection.Collection) => {
  const find: OrionCollection.Find = (selectorArg, options) => {
    const selector = getSelector(selectorArg)

    const cursor = collection.rawCollection.find(selector, options)

    const originalToArray = cursor.toArray

    cursor.toArray = async () => {
      const items = await originalToArray()
      return items.map(item => collection.initItem(item))
    }

    return cursor
  }

  return find
}
