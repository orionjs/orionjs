import {Collection, InitItem} from '../types'

export default (collection: Partial<Collection>) => {
  const initItem = doc => {
    if (!doc) return doc
    if (!collection.model) return doc

    return collection.model.initItem(doc)
  }

  return initItem
}
