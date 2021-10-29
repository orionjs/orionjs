import {Collection, DataLoader} from '../../../types'

export default function <DocumentType>(collection: Collection) {
  const loadMany: DataLoader.LoadMany<DocumentType> = async options => {
    const results = await collection.loadData(options)
    return results
  }

  return loadMany
}
