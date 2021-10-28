import {OrionCollection} from '../../Types'

export default function (collection: OrionCollection.Collection) {
  const loadMany: OrionCollection.DataLoader.LoadMany = async options => {
    const results = await collection.loadData(options)
    return results
  }

  return loadMany
}
