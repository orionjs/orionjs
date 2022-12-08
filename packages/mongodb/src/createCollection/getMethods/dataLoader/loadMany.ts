import {Collection, DataLoader, ModelClassBase} from '../../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  const loadMany: DataLoader.LoadMany<DocumentType> = async options => {
    const results = await collection.loadData(options)
    return results
  }

  return loadMany
}
