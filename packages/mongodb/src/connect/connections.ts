import {MongoClient, Db} from 'mongodb'

export interface OrionMongoClient {
  client: MongoClient
  db: Db
  dbName: string
  connectionPromise: Promise<MongoClient>
}

export interface OrionMongoConnectionsMap {
  [key: string]: OrionMongoClient
}

export const connections: OrionMongoConnectionsMap = {}
