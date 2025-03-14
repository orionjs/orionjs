import {createIndexesPromises, connections} from '@orion-js/mongodb'
import {afterAll} from 'vitest'
import {MongoMemoryServer} from 'mongodb-memory-server'
import {generateId} from '@orion-js/helpers'

// Declare mongod at module scope so it can be accessed by both beforeAll and afterAll
const mongod = await MongoMemoryServer.create()

const uri = mongod.getUri()
// Replace console.log with a comment
// console.log('mongodb_uri', { uri })

process.env.MONGO_URL = `${uri}${generateId(12)}`

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
