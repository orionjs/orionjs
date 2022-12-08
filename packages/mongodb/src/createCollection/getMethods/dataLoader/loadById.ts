import {Collection, DataLoader, ModelClassBase} from '../../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  const loadById: DataLoader.LoadById<DocumentType> = async id => {
    const result = await collection.loadOne({
      key: '_id',
      value: id
    })

    return result
  }

  return loadById
}
