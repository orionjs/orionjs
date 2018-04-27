import connect from '../database/connect'
import getMethods from './getMethods'
import checkOptions from './checkOptions'

global.db = {}

export default function(options) {
  checkOptions(options)

  const collection = {
    ...options
  }

  connect().then(db => {
    const rawCollection = db.collection(options.name)
    collection.rawCollection = rawCollection

    const methods = getMethods(collection)
    for (const key of Object.keys(methods)) {
      collection[key] = methods[key]
    }
  })

  global.db[options.name] = collection

  return collection
}
