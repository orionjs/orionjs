import isPlainObject from 'lodash/isPlainObject'
import {Collection, InsertOne} from '../../types'
import fromDot from '../../helpers/fromDot'

export default <DocumentType>(collection: Collection) => {
  const insertOne: InsertOne<DocumentType> = async (insertDoc, options) => {
    let doc = insertDoc as any
    if (!doc || !isPlainObject(doc)) {
      throw new Error('Insert must receive a document')
    }

    if (collection.model) {
      doc = await collection.model.clean(fromDot(doc))
      await collection.model.validate(doc)
    }

    if (!doc._id) {
      doc._id = collection.generateId()
    }

    await collection.rawCollection.insertOne(doc)

    return doc._id
  }

  return insertOne
}
