import isPlainObject from 'lodash/isPlainObject'
import {Collection, InsertMany, ModelClassBase} from '../../types'
import {cloneDeep, values} from 'lodash'
import * as MongoDB from 'mongodb'
import fromDot from '../../helpers/fromDot'
import {clean, validate} from '@orion-js/schema'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) => {
  const insertMany: InsertMany<DocumentType> = async (docs, options = {}) => {
    await collection.connectionPromise
    for (let index = 0; index < docs.length; index++) {
      let doc = cloneDeep(docs[index]) as any

      if (!doc || !isPlainObject(doc)) {
        throw new Error(`Item at index ${index} is not a document`)
      }

      if (!doc._id) {
        doc._id = collection.generateId()
      }

      if (collection.schema) {
        const schema = collection.getSchema()
        doc = await clean(schema, fromDot(doc))
        await validate(schema, doc)
      }

      docs[index] = doc
    }
    const {insertedIds} = await wrapErrors(() => {
      return collection.rawCollection.insertMany(docs as any, options.mongoOptions)
    })

    const ids: Array<MongoDB.ObjectId> = values(insertedIds)

    return ids.map(id => id.toString())
  }

  return insertMany
}
