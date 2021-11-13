import {MongoClient} from 'mongodb'
import {OrionMongoClient, connections} from './connections'
import getDBName from './getDBName'

export const connectToDB = ({name, uri}): OrionMongoClient => {
  if (!uri) {
    throw new Error('MongoURI is undefined')
  }
  const client = new MongoClient(uri)

  const connectionPromise = client.connect()

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
