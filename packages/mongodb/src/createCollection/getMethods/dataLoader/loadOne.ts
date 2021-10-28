import {OrionCollection} from '../../Types'

export default function <DocumentType>(collection: OrionCollection.Collection) {
  const loadOne: OrionCollection.DataLoader.LoadOne<DocumentType> = async options => {
    const [result] = await collection.loadData(options)
    return result
  }

  return loadOne
}
