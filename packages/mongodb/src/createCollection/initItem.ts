import {Collection, InitItem, ModelClassBase} from '../types'

export default function initItem<ModelClass extends ModelClassBase>(
  collection: Partial<Collection<ModelClass>>
) {
  const initItem: InitItem<ModelClass> = doc => {
    if (!doc) return doc
    if (!collection.model) return doc

    return collection.model.initItem(doc)
  }

  return initItem
}
