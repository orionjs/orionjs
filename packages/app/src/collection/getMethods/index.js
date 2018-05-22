import insert from './insert'
import find from './find'
import findOne from './findOne'
import aggregate from './aggregate'
import update from './update'
import remove from './remove'
import upsert from './upsert'
import handleError from './handleError'

export default function(collection) {
  const {model, rawCollection} = collection
  const {schema} = model || {}

  let funcs

  const initItem = function(doc) {
    const item = model.initItem(doc)
    item.remove = async function() {
      const result = await funcs.remove(doc._id)
      if (result !== 1) {
        throw new Error('Error removing item')
      }
    }
    item.update = async function(modifier) {
      const result = await funcs.update(doc._id, modifier)
      if (result !== 1) {
        throw new Error('Error updating item')
      }
    }
    return item
  }

  const info = {model, schema, initItem, collection, rawCollection}

  funcs = {
    find: find(info),
    findOne: findOne(info),
    aggregate: aggregate(info),
    insert: handleError(insert(info)),
    update: handleError(update(info)),
    remove: handleError(remove(info)),
    upsert: handleError(upsert(info))
  }

  return funcs
}
