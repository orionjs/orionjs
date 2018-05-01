import generateId from './generateId'
import getSelector from './getSelector'
import {validate} from '@orion-js/schema'
import isPlainObject from 'lodash/isPlainObject'

export default function(collection) {
  const {model} = collection
  const {schema} = model

  const getRawCollection = () => {
    const {rawCollection} = collection
    if (!rawCollection) {
      throw new Error('DB is not connected yet')
    }
    return rawCollection
  }

  const funcs = {
    find(...args) {
      const options = args[1]
      const selector = getSelector(args)
      const rawCollection = getRawCollection()
      const cursor = rawCollection.find(selector, options)

      return {
        cursor,
        async count() {
          return await cursor.count()
        },
        async toArray() {
          const items = await cursor.toArray()
          return items.map(item => model.initItem(item))
        }
      }
    },
    async findOne(...args) {
      const options = args[1]
      const selector = getSelector(args)
      const rawCollection = getRawCollection()

      const item = await rawCollection.findOne(selector, options)
      if (!item) return item
      return model.initItem(item)
    },
    aggregate(pipeline) {
      const rawCollection = getRawCollection()
      return rawCollection.aggregate(pipeline)
    },
    async insert(doc) {
      if (!doc || !isPlainObject(doc)) {
        throw new Error('Insert must receive a document')
      }
      doc._id = generateId()
      if (schema) {
        console.log(doc)
        await validate(schema, doc)
        console.log('did pass validation')
      }
      const rawCollection = getRawCollection()
      await rawCollection.insert(doc)
      return doc._id
    },
    async update(selector, doc, options) {
      const rawCollection = getRawCollection()
      const result = await rawCollection.update(getSelector(selector), doc, options)
      return result
    },
    async remove(selector, options) {
      const rawCollection = getRawCollection()
      const result = await rawCollection.remove(getSelector(selector), options)
      return result
    },
    async upsert(selector, doc) {
      doc.$setOnInsert = {_id: generateId()}
      const rawCollection = getRawCollection()
      const result = await rawCollection.update(getSelector(selector), doc, {upsert: true})
      return result
    }
  }

  return funcs
}
