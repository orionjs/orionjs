import {Collection, InitItem} from '../types'

export default <DocumentType>(collection: Collection) => {
  const initItem: InitItem<DocumentType> = <DocumentType>(doc) => {
    if (!doc) return doc

    return doc as DocumentType
  }

  return initItem
}
