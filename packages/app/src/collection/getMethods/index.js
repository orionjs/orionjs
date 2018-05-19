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

  const info = {model, schema, collection, rawCollection}

  const funcs = {
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
