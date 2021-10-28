import {OrionCollection} from './Types'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const initItem: OrionCollection.InitItem<DocumentType> = <DocumentType>(doc) => {
    if (!doc) return doc

    return doc as DocumentType
  }

  return initItem
}
