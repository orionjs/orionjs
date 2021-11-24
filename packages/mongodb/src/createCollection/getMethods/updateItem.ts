import {Collection, UpdateItem} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const updateItem: UpdateItem<DocumentType> = async function (item, modifier) {
    const updated = await collection.updateAndFind({_id: item._id}, modifier)

    for (const key in item) {
      delete item[key]
    }

    for (const key in updated) {
      item[key] = updated[key]
    }
  }
  return updateItem
}
