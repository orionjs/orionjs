import {OrionCollection} from '../../Types'

export default function <DocumentType>(collection: OrionCollection.Collection) {
  const loadMany: OrionCollection.DataLoader.LoadMany<DocumentType> = async options => {
    const results = await collection.loadData(options)
    return results
  }

  return loadMany
}
