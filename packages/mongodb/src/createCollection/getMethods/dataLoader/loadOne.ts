import {OrionCollection} from '../../Types'

export default function (collection: OrionCollection.Collection) {
  const loadOne: OrionCollection.DataLoader.LoadOne = async options => {
    const [result] = await collection.loadData(options)
    return result
  }

  return loadOne
}
