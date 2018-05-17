import insert from './insert'
import find from './find'
import findOne from './findOne'
import aggregate from './aggregate'
import update from './update'
import remove from './remove'
import upsert from './upsert'
import handleError from './handleError'

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

  const info = {model, schema, collection, getRawCollection}

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
