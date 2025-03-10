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

  const connectionPromise = connect(client)
  allConnectionPromises.push(connectionPromise)

  const dbName = getDBName(uri)
  const db = client.db(dbName)

  const mongoClient: OrionMongoClient = {
    uri,
    client,
    connectionPromise,
    dbName,
    db,
    connectionName: name,
  }

  connections[name] = mongoClient

  return mongoClient
}
