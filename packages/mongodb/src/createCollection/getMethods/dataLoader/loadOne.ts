import {Collection, DataLoader} from '../../../types'

export default function <DocumentType>(collection: Collection) {
  const loadOne: DataLoader.LoadOne<DocumentType> = async options => {
    const [result] = await collection.loadData(options)
    return result
  }

  return loadOne
}
