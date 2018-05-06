import connect from '../database/connect'
import getMethods from './getMethods'
import checkOptions from './checkOptions'
import loadIndexes from './loadIndexes'
import Model from '../Model'

global.db = {}

export default function(passedOptions) {
  const defaultOptions = {
    model: new Model({name: 'defaultModelFor_' + passedOptions.name || 'nn'})
  }

  const options = {
    ...defaultOptions,
    ...passedOptions
  }

  checkOptions(options)

  const collection = {
    ...options
  }

  global.db[options.name] = collection

  const resolvers = []
  let isReady = false
  let onReady = () => resolvers.map(resolve => resolve(collection))
  collection.await = async () => (isReady ? null : new Promise(resolve => resolvers.push(resolve)))

  const methods = getMethods(collection)
  for (const key of Object.keys(methods)) {
    collection[key] = methods[key]
  }

  connect().then(db => {
    const rawCollection = db.collection(options.name)
    collection.rawCollection = rawCollection

    loadIndexes(collection)

    onReady()
    isReady = true
  })

  return collection
}
