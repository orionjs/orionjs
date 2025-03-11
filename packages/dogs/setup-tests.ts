import {createIndexesPromises, getMongoConnection, connections} from '@orion-js/mongodb'
import {beforeEach, afterAll} from 'vitest'
import {MongoMemoryServer} from 'mongodb-memory-server'
import {generateId} from '@orion-js/helpers'

const mongod: MongoMemoryServer = await MongoMemoryServer.create()
const uri = mongod.getUri()

beforeEach(async () => {
  process.env.MONGO_URL = `${uri}${generateId(12)}`

  const connection = getMongoConnection({name: 'main'})
  console.log(connection)
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
