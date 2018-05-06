import insert from './insert'
import find from './find'
import findOne from './findOne'
import aggregate from './aggregate'
import update from './update'
import remove from './remove'
import upsert from './upsert'

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
    insert: insert(info),
    update: update(info),
    remove: remove(info),
    upsert: upsert(info)
  }

  return funcs
}
