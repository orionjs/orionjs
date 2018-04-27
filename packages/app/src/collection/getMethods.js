import generateId from './generateId'
import getSelector from './getSelector'
import {validate} from '@orion-js/schema'

export default function({model, rawCollection}) {
  const collection = rawCollection
  const schema = model.schema

  const funcs = {
    find(selector, options) {
      const cursor = collection.find(getSelector(selector), options)

      return {
        cursor,
        count: cursor.count,
        async toArray() {
          const items = await cursor.toArray()
          return items.map(item => model.initItem(item))
        }
      }
    },
    async findOne(selector, options) {
      const item = await collection.findOne(getSelector(selector), options)
      if (!item) return item
      return model.initItem(item)
    },
    aggregate(pipeline) {
      return collection.aggregate(pipeline)
    },
    async insert(doc) {
      if (schema) {
        await validate(schema, doc)
      }
      doc._id = generateId()
      await collection.insert(doc)
      return doc._id
    },
    async update(selector, doc, options) {
      const result = await collection.update(getSelector(selector), doc, options)
      return result
    },
    async remove(selector, options) {
      const result = await collection.remove(getSelector(selector), options)
      return result
    },
    async upsert(selector, doc) {
      doc.$setOnInsert = {_id: generateId()}
      const result = await collection.update(getSelector(selector), doc, {upsert: true})
      return result
    }
  }

  return funcs
}
