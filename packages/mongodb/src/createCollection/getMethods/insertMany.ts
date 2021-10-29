import isPlainObject from 'lodash/isPlainObject'
import {Collection, InsertMany} from '../../types'
import {cloneDeep, values} from 'lodash'
import * as MongoDB from 'mongodb'
import fromDot from '../../helpers/fromDot'

export default <DocumentType>(collection: Collection) => {
  const insertMany: InsertMany<DocumentType> = async (docs, options = {}) => {
    for (let index = 0; index < docs.length; index++) {
      let doc = cloneDeep(docs[index]) as any

      if (!doc || !isPlainObject(doc)) {
        throw new Error(`Item at index ${index} is not a document`)
      }

      if (collection.model) {
        doc = await collection.model.clean(fromDot(doc))
        await collection.model.validate(doc)
      }

      if (!doc._id) {
        doc._id = collection.generateId()
      }

      docs[index] = doc
    }
    const {insertedIds} = await collection.rawCollection.insertMany(docs, options.mongoOptions)

    const ids: Array<MongoDB.ObjectId> = values(insertedIds)

    return ids.map(id => id.toString())
  }

  return insertMany
}
