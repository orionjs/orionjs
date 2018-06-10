import {validate, clean} from '@orion-js/schema'
import isPlainObject from 'lodash/isPlainObject'
import generateId from './generateId'
import fromDot from '../../database/dot/fromDot'

export default ({rawCollection, schema}) =>
  async function insert(doc, options) {
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
    await rawCollection.insert(doc, options)
    return doc._id
  }
