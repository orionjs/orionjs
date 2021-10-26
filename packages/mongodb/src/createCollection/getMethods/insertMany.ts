import isPlainObject from 'lodash/isPlainObject'
import {OrionCollection} from '../Types'
import {generateId} from '@orion-js/helpers'
import {values} from 'lodash'
import * as MongoDB from 'mongodb'

export default (collection: OrionCollection.Collection) => {
  const insertMany: OrionCollection.InsertMany = async (docs, options) => {
    for (const doc of docs) {
      if (!doc || !isPlainObject(doc)) {
        throw new Error('Insert must receive a document')
      }
      if (!doc._id) {
        doc._id = generateId()
      }

      // if (schema) {
      //   doc = await clean(schema, fromDot(doc))
      //   await validate(schema, doc)
      // }
    }

    const {insertedIds} = await collection.rawCollection.insertMany(docs)

    const ids: Array<MongoDB.ObjectId> = values(insertedIds)

    return ids.map(id => id.toString())
  }

  return insertMany
}
