import getMethods from './getMethods'
import checkOptions from './checkOptions'
import loadIndexes from './loadIndexes'
import Model from '../Model'
import connect from '../database/connect'
import checkIndexes from './checkIndexes'

global.db = {}

export default function (passedOptions) {
  const defaultOptions = {
    model: new Model({ name: 'defaultModelFor_' + passedOptions.name || 'nn' }),
    passUpdateAndRemove: true,
    hooks: [],
    hasCustomConnection: !!passedOptions.connection,
    // dont make the request if its not using the default
    connection: passedOptions.connection ? null : connect()
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

  options.connection.then(async ({ database, encrypted }) => {
    if (!database) {
      console.log('No database connection', { database, options })
    }
    checkOptions(options)
    global.db[options.name] = collection

    collection.rawCollection = database.collection(options.name)

    const methods = getMethods(collection)
    for (const key of Object.keys(methods)) {
      collection[key] = methods[key]
    }

    if (encrypted?.database) {
      const encryptedCollection = {
        ...options,
      }
      encryptedCollection.rawCollection = encrypted.database.collection(options.name)
      const encryptedMethods = getMethods(encryptedCollection)
      for (const key of Object.keys(encryptedMethods)) {
        encryptedCollection[key] = encryptedMethods[key]
      }
      collection.encrypted = encryptedCollection
    }

    await loadIndexes(collection)
    await checkIndexes(collection)

    onReady()
    isReady = true

  })

  return collection
}
