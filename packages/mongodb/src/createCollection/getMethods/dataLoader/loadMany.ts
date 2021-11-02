import {Collection, DataLoader} from '../../../types'

export default function <ModelClass>(collection: Collection) {
  const loadMany: DataLoader.LoadMany<ModelClass> = async options => {
    const results = await collection.loadData(options)
    return results
  }

  return loadMany
}
