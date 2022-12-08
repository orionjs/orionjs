import isPlainObject from 'lodash/isPlainObject'
import {Collection, InsertOne, ModelClassBase} from '../../types'
import fromDot from '../../helpers/fromDot'
import {clean, validate} from '@orion-js/schema'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) => {
  const insertOne: InsertOne<DocumentType> = async (insertDoc, options) => {
    await collection.connectionPromise
    let doc = insertDoc as any
    if (!doc || !isPlainObject(doc)) {
      throw new Error('Insert must receive a document')
    }

    if (!doc._id) {
      doc._id = collection.generateId()
    }

    if (collection.schema) {
      const schema = collection.getSchema()
      doc = await clean(schema, fromDot(doc))
      await validate(schema, doc)
    }

    await wrapErrors(async () => {
      await collection.rawCollection.insertOne(doc)
    })

    return doc._id
  }

  return insertOne
}
