import {validate, clean} from '@orion-js/schema'
import isPlainObject from 'lodash/isPlainObject'
import generateId from './generateId'
import fromDot from '../../database/dot/fromDot'

export default ({getRawCollection, schema}) =>
  async function insert(doc) {
    if (!doc || !isPlainObject(doc)) {
      throw new Error('Insert must receive a document')
    }
    doc._id = generateId()
    if (schema) {
      doc = await clean(schema, fromDot(doc))
      await validate(schema, doc)
    }
    const rawCollection = getRawCollection()
    await rawCollection.insert(doc)
    return doc._id
  }
