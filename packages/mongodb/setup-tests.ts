import {afterAll} from 'vitest'
import {MongoMemoryServer} from 'mongodb-memory-server'
import {connections} from './src/connect/connections'
import {createIndexesPromises} from './src/createCollection'

// Declare mongod at module scope so it can be accessed by both beforeAll and afterAll
const mongod = await MongoMemoryServer.create()

const uri = mongod.getUri()
// Replace console.log with a comment
// console.log('mongodb_uri', { uri })

process.env.MONGO_URL = uri

// beforeAll(async () => {
//   const connection = getMongoConnection({name: 'main'})
// })

afterAll(async () => {
  /**
   * We need to wait on indexes promises to be resolved to close all the handlers
   */
  await Promise.all(createIndexesPromises)

  // Close all connections
  for (const connection of Object.values(connections)) {
    await connection.closeConnection()
  }

  // Stop the in-memory MongoDB instance
  await mongod.stop()
})
