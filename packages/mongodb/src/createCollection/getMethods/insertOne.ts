import isPlainObject from 'lodash/isPlainObject'
import {generateId} from '@orion-js/helpers'
import {OrionCollection} from '../Types'
import fromDot from '../../helpers/fromDot'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const insertOne: OrionCollection.InsertOne<DocumentType> = async (insertDoc, options) => {
    let doc = insertDoc as any
    if (!doc || !isPlainObject(doc)) {
      throw new Error('Insert must receive a document')
    }

    if (!doc._id) {
      doc._id = generateId()
    }

    if (collection.model) {
      doc = await collection.model.clean(fromDot(doc))
      await collection.model.validate(doc)
    }

    await collection.rawCollection.insertOne(doc)

    return doc._id
  }

  return insertOne
}
