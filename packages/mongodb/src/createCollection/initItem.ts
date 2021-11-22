import {
  Collection,
  InitItem,
  ModelItem,
  ModelToUpdateFilter,
  DocumentWithId,
  UpdateOptions,
  ModelItemEnhancements
} from '../types'
import updateOne from './getMethods/updateOne'

const isDocumentWithId = <ModelClass = any>(doc: ModelClass): doc is DocumentWithId<ModelClass> => {
  return doc && '_id' in doc
}

export default function initItem<ModelClass = any>(
  collection: Partial<Collection<ModelClass>>
): (doc: ModelClass) => ModelItem<ModelClass> {
  const initItem = (doc: ModelClass): ModelItem<ModelClass> => {
    if (!doc) return doc
    if (!collection.model) return doc

    if (!isDocumentWithId(doc)) return doc

    const result: Partial<ModelItem<ModelClass>> = collection.model.initItem(doc)

    ;(result as ModelItemEnhancements<ModelClass>).update = async (
      modifier: ModelToUpdateFilter<ModelClass>,
      options?: UpdateOptions
    ) => {
      const updateResult = await collection.updateOne(doc._id, modifier, options)
      const updatedDoc = await collection.findOne(doc._id)
      for (const key in updatedDoc) {
        ;(doc as ModelClass)[key] = updatedDoc[key]
      }

      return updateResult
    }

    return result as ModelItem<ModelClass>
  }

  return initItem
}
