import {MongoClient, Db} from 'mongodb'

export interface OrionMongoClient {
  client: MongoClient
  db: Db
  uri: string
  dbName: string
  connectionPromise: Promise<MongoClient>
  connectionName: string
}

export interface OrionMongoConnectionsMap {
  [key: string]: OrionMongoClient
}

export const connections: OrionMongoConnectionsMap = {}
