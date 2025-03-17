import {Collection, InsertOne, ModelClassBase} from '../../types'
import fromDot from '../../helpers/fromDot'
import {clean, validate} from '@orion-js/schema'
import {wrapErrors} from './wrapErrors'
import {isType} from 'rambdax'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const insertOne: InsertOne<DocumentType> = async (insertDoc, options = {}) => {
    await collection.connectionPromise
    let doc = insertDoc as DocumentType
    if (!doc || !isType('Object', doc)) {
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
      await collection.rawCollection.insertOne(doc, options.mongoOptions)
    })

    return doc._id
  }

  return insertOne
}
