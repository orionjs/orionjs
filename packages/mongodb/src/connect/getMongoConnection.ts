import {MongoClient} from 'mongodb'
import {OrionMongoClient, connections} from './connections'
import getDBName from './getDBName'
import {getMongoURLFromEnv} from './getMongoURLFromEnv'

export const allConnectionPromises = []

interface MongoConnectOptions {
  name: string
  uri?: string
}

export const getMongoConnection = ({name, uri}: MongoConnectOptions): OrionMongoClient => {
  uri = uri || getMongoURLFromEnv(name)
  if (connections[name]) return connections[name]

  const client = new MongoClient(uri)

  const connectionPromise = client.connect()
  allConnectionPromises.push(connectionPromise)

  const dbName = getDBName(uri)
  const db = client.db(dbName)

  const mongoClient = {
    uri,
    client,
    connectionPromise,
    dbName,
    db,
    connectionName: name
  }

  connections[name] = mongoClient

  return mongoClient
}
