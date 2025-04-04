import {Collection} from '../types'
import {logger} from '@orion-js/logger'

export function wrapMethods(collection: Partial<Collection>) {
  // Wrap all collection methods to ensure connection is started
  const methodsWithPromises = [
    'findOne',
    'findOneAndUpdate',
    'insertOne',
    'insertMany',
    'insertAndFind',
    'updateOne',
    'updateMany',
    'deleteMany',
    'deleteOne',
    'upsert',
    'estimatedDocumentCount',
    'countDocuments',
    'updateAndFind',
    'updateItem',
    'loadData',
    'loadById',
    'loadOne',
    'loadMany',
  ]

  const methodsWithoutPromises = ['aggregate', 'find', 'watch']

  const originalMethods = {...collection}

  for (const methodName of methodsWithPromises) {
    if (typeof collection[methodName] === 'function') {
      collection[methodName] = async (...args: any[]) => {
        await collection.startConnection()
        return originalMethods[methodName](...args)
      }
    }

    for (const methodName of methodsWithoutPromises) {
      if (typeof collection[methodName] === 'function') {
        collection[methodName] = (...args: any[]) => {
          collection.startConnection()
          if (!collection.rawCollection) {
            logger.error('Method called before connection was initialized', {
              collectionName: collection.name,
              connectionName: collection.connectionName,
              methodName,
            })
            throw new Error('Method called before connection was initialized')
          }
          return originalMethods[methodName](...args)
        }
      }
    }
  }
}
