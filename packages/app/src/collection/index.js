import connect from '../database/connect'
import getMethods from './getMethods'
import checkOptions from './checkOptions'
import loadIndexes from './loadIndexes'

global.db = {}

export default function(options) {
  checkOptions(options)

  const collection = {
    ...options
  }

  global.db[options.name] = collection

  const methods = getMethods(collection)
  for (const key of Object.keys(methods)) {
    collection[key] = methods[key]
  }

  connect().then(db => {
    const rawCollection = db.collection(options.name)
    collection.rawCollection = rawCollection

    loadIndexes(collection)
  })

  return collection
}
