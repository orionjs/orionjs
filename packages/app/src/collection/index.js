import getMethods from './getMethods'
import checkOptions from './checkOptions'
import loadIndexes from './loadIndexes'
import Model from '../Model'
import connect from '../database/connect'
import checkIndexes from './checkIndexes'

global.db = {}

export default function (passedOptions) {
  const defaultOptions = {
    model: new Model({name: 'defaultModelFor_' + passedOptions.name || 'nn'}),
    passUpdateAndRemove: true,
    hooks: [],
    hasCustomConnection: !!passedOptions.connection,
    // dont make the request if its not using the default
    connection: passedOptions.connection ? null : connect().then(database => ({database}))
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

  options.connection.then(async ({database}) => {
    checkOptions(options)
    global.db[options.name] = collection

    const rawCollection = database.collection(options.name)
    collection.rawCollection = rawCollection

    const methods = getMethods(collection)
    for (const key of Object.keys(methods)) {
      collection[key] = methods[key]
    }
    await loadIndexes(collection)
    await checkIndexes(collection)

    onReady()
    isReady = true
  })

  return collection
}
