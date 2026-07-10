import {clean, validate} from '@orion-js/schema'
import {isType} from 'rambdax'
import fromDot from '../../helpers/fromDot'
import {Collection, InsertOne, ModelClassBase} from '../../types'
import {wrapErrors} from './wrapErrors'

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
      await collection.rawCollection.insertOne(doc as any, options.mongoOptions)
    })

    return doc._id
  }

  return insertOne
}
