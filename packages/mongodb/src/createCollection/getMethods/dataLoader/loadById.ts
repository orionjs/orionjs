import {Collection, DataLoader} from '../../../types'

export default function <DocumentType>(collection: Partial<Collection>) {
  const loadById: DataLoader.LoadById<DocumentType> = async id => {
    const result = await collection.loadOne({
      key: '_id',
      value: id
    })

    return result
  }

  return loadById
}
