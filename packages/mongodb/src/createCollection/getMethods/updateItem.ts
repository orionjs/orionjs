import {Collection, ModelClassBase, UpdateItem} from '../../types'
import {wrapErrors} from './wrapErrors'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const updateItem: UpdateItem<DocumentType> = async function (item, modifier, options = {}) {
    await collection.connectionPromise
    const updated = await wrapErrors(async () => {
      return await collection.updateAndFind(item._id, modifier, options)
    })

    for (const key in item) {
      delete item[key]
    }

    for (const key in updated) {
      item[key] = updated[key]
    }
  }
  return updateItem
}
