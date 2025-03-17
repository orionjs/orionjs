import {MongoClient} from 'mongodb'
import {connections} from './connections'
import type {OrionMongoClient} from './connections'
import getDBName from './getDBName'
import {getMongoURLFromEnv} from './getMongoURLFromEnv'
import {logger} from '@orion-js/logger'
import {sleep} from '@orion-js/helpers'
export const allConnectionPromises = []

interface MongoConnectOptions {
  name: string
  uri?: string
}

async function connect(client: MongoClient): Promise<MongoClient> {
  try {
    const result = await client.connect()
    return result
  } catch (error) {
    logger.error(`Error connecting to mongo: ${error.message}. Will retry in 5s`, error)
    await sleep(5000)
    return connect(client)
  }
}

export const getMongoConnection = ({name, uri}: MongoConnectOptions): OrionMongoClient => {
  uri = uri || getMongoURLFromEnv(name)
  if (connections[name]) return connections[name]

  const client = new MongoClient(uri, {
    retryReads: true,
  })

  let resolveConnected: (value: MongoClient) => void
  const connectionPromise = new Promise<MongoClient>(resolve => {
    resolveConnected = resolve
  })
  let internalConnectionPromise: Promise<MongoClient>

  /**
   * This function will start the connection to the database
   * and return the promise of the connection
   */
  const startConnection = async () => {
    if (internalConnectionPromise) {
      return await internalConnectionPromise
    }

    internalConnectionPromise = connect(client)
    allConnectionPromises.push(internalConnectionPromise)
    internalConnectionPromise.then(client => {
      resolveConnected(client)
    })

    return await internalConnectionPromise
  }

  const dbName = getDBName(uri)
  const db = client.db(dbName)

  const mongoClient: OrionMongoClient = {
    uri,
    client,
    connectionPromise,
    startConnection,
    dbName,
    db,
    connectionName: name,
  }

  connections[name] = mongoClient

  return mongoClient
}
