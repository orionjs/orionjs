import {getExistingConnection} from './connections'
import type {OrionMongoClient} from './connections'
import {getMongoURLFromEnv, requiresExplicitSetup} from './getMongoURLFromEnv'
export const allConnectionPromises = []

interface MongoConnectOptions {
  name: string
  uri?: string
}

export const getMongoConnection = ({name, uri}: MongoConnectOptions): OrionMongoClient => {
  uri = uri || getMongoURLFromEnv(name)
  const connection = getExistingConnection(name)

  if (!connection.configured && !requiresExplicitSetup(name)) {
    connection.config(uri, {})
  }
  allConnectionPromises.push(connection.connectionPromise)
  return connection
}
