import insert from './insert'
import find from './find'
import findOne from './findOne'
import aggregate from './aggregate'
import update from './update'
import remove from './remove'
import upsert from './upsert'
import handleError from './handleError'
import updateItemWithModifier from './updateItemWithModifier'
import findOneAndUpdate from './findOneAndUpdate'
import updateOne from './updateOne'
import updateMany from './updateMany'
import deleteOne from './deleteOne'
import deleteMany from './deleteMany'

export default function(collection) {
  const {model, rawCollection, passUpdateAndRemove} = collection
  const {schema} = model || {}

  let funcs

  const initItem = function(doc) {
    const item = model ? model.initItem(doc) : doc
    if (passUpdateAndRemove) {
      item.remove = async function() {
        const result = await funcs.remove(doc._id)
        return result
      }
      item.update = async function(modifier) {
        const result = await funcs.update(doc._id, modifier)
        if (result === 1) {
          updateItemWithModifier(item, modifier)
        }
        return result
      }
    }
    return item
  }

  const info = {model, schema, initItem, collection, rawCollection}

  funcs = {
    find: find(info),
    findOne: findOne(info),
    aggregate: aggregate(info),
    findOneAndUpdate: findOneAndUpdate(info),
    insert: handleError(insert(info)),
    update: handleError(update(info)),
    updateOne: handleError(updateOne(info)),
    updateMany: handleError(updateMany(info)),
    remove: handleError(remove(info)),
    deleteOne: handleError(deleteOne(info)),
    deleteMany: handleError(deleteMany(info)),
    upsert: handleError(upsert(info))
  }

  return funcs
}
