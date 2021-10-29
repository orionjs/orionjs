import {OrionCollection} from '../../Types'

export default function <DocumentType>(collection: OrionCollection.Collection) {
  const loadById: OrionCollection.DataLoader.LoadById<DocumentType> = async id => {
    const result = await collection.loadOne({
      key: '_id',
      value: id
    })

    return result
  }

  return loadById
}
