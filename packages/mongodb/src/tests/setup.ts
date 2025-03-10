import {createIndexesPromises, getMongoConnection} from '..'
import {connections} from '../connect/connections'
import {beforeAll, afterAll} from 'bun:test'
import {MongoMemoryServer} from 'mongodb-memory-server'

// Declare mongod at module scope so it can be accessed by both beforeAll and afterAll
let mongod: MongoMemoryServer

beforeAll(async () => {
  // This will create an new instance of "MongoMemoryServer" and automatically start it
  mongod = await MongoMemoryServer.create()

  const uri = mongod.getUri()
  // Replace console.log with a comment
  // console.log('mongodb_uri', { uri })

  process.env.MONGO_URL = uri

  // The Server can be stopped again with

  const connection = getMongoConnection({name: 'main'})
  await connection.connectionPromise
})

afterAll(async () => {
  /**
   * We need to wait on indexes promises to be resolved to close all the handlers
   */
  await Promise.all(createIndexesPromises)

  // Close all connections
  for (const connection of Object.values(connections)) {
    await connection.client.close()
  }

  // Stop the in-memory MongoDB instance
  await mongod.stop()
})
