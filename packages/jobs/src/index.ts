import {MongoClient} from 'mongodb'
import {getJobRetriesCollection} from './collections/getJobRetriesCollection'
import {getJobUniquenessKeysCollection} from './collections/getJobUniquenessKeysCollection'

export * from './operations' // init, start, stop
export * from './job' // job(...) factory
export * from './JobManager' // In case the user wants to access agenda instance
export * from './types'

export function getConnectionPromise(): Promise<[MongoClient, MongoClient]> {
  return Promise.all([
    getJobRetriesCollection().connectionPromise,
    getJobUniquenessKeysCollection().connectionPromise
  ])
}
