import {type} from 'rambdax'
import {Collection, InsertAndFind, ModelClassBase} from '../../types'
import fromDot from '../../helpers/fromDot'
import {clean, validate} from '@orion-js/schema'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const insertAndFind: InsertAndFind<DocumentType> = async (insertDoc, options = {}) => {
    await collection.connectionPromise
    let doc = insertDoc as any
    if (!doc || type(doc) !== 'Object') {
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

    return doc
  }

  return insertAndFind
}
