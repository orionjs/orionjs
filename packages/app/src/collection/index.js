import connect from '../database/connect'
import getMethods from './getMethods'

export default function(options) {
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

  return collection
}
