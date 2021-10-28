import {OrionCollection} from '../../Types'

export default function (collection: OrionCollection.Collection) {
  const loadById: OrionCollection.DataLoader.LoadById = async id => {
    const result = await collection.loadOne({
      key: '_id',
      value: id
    })

    return result
  }

  return loadById
}
