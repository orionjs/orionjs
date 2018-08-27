import {validate, clean} from '@orion-js/schema'
import isPlainObject from 'lodash/isPlainObject'
import generateId from '../../helpers/generateId'
import fromDot from '../../database/dot/fromDot'
import runHooks from './runHooks'
import values from 'lodash/values'

export default ({rawCollection, schema, collection}) =>
  async function insertMany(docs, options, ...args) {
    for (let i = 0; i < docs.length; i++) {
      let doc = docs[i]
      if (!doc || !isPlainObject(doc)) {
        throw new Error('Insert must receive a document')
      }
      if (!doc._id) {
        doc._id = generateId()
      }

      if (schema) {
        doc = await clean(schema, fromDot(doc))
        await validate(schema, doc)
      }
      docs[i] = doc
    }

    for (const doc of docs) {
      await runHooks(collection, 'before.insert', doc, options, ...args)
    }

    const {insertedIds} = await rawCollection.insertMany(docs, options)

    for (const doc of docs) {
      await runHooks(collection, 'after.insert', doc, options, ...args)
    }

    return values(insertedIds)
  }
