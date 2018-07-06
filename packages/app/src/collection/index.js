import connect from '../database/connect'
import getMethods from './getMethods'
import checkOptions from './checkOptions'
import loadIndexes from './loadIndexes'
import Model from '../Model'

global.db = {}

export default function(passedOptions) {
  const defaultOptions = {
    model: new Model({name: 'defaultModelFor_' + passedOptions.name || 'nn'}),
    passUpdateAndRemove: true,
    hooks: []
  }

  const options = {
    ...defaultOptions,
    ...passedOptions
  }

  const collection = {
    ...options
  }

  const resolvers = []
  let isReady = false
  let onReady = () => resolvers.map(resolve => resolve(collection))
  collection.await = async () => (isReady ? null : new Promise(resolve => resolvers.push(resolve)))

  connect().then(db => {
    checkOptions(options)
    global.db[options.name] = collection

    const rawCollection = db.collection(options.name)
    collection.rawCollection = rawCollection

    const methods = getMethods(collection)
    for (const key of Object.keys(methods)) {
      collection[key] = methods[key]
    }

    loadIndexes(collection)

    onReady()
    isReady = true
  })

  return collection
}
