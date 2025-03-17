import {Collection, DataLoader, ModelClassBase} from '../../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const loadOne: DataLoader.LoadOne<DocumentType> = async options => {
    const [result] = await collection.loadData(options)
    return result
  }

  return loadOne
}
