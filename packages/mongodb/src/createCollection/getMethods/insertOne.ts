import isPlainObject from 'lodash/isPlainObject'
import {generateId} from '@orion-js/helpers'
import {OrionCollection} from '../Types'

export default (collection: OrionCollection.Collection) => {
  const insertOne: OrionCollection.InsertOne = async (doc, options) => {
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

    await collection.rawCollection.insertOne(doc)

    return doc._id
  }

  return insertOne
}
