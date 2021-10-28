import {MongoClient} from 'mongodb'
import {OrionMongoClient, connections} from './connections'
import getDBName from './getDBName'

export const connectToDB = ({name, uri}): OrionMongoClient => {
  const client = new MongoClient(uri)

  const connectionPromise = client.connect()

  const dbName = getDBName(uri)
  const db = client.db(dbName)

  const mongoClient = {
    client,
    connectionPromise,
    dbName,
    db
  }

  connections[name] = mongoClient

  return mongoClient
}
