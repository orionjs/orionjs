import {createIndexesPromises, getMongoConnection, connections} from '@orion-js/mongodb'

const url = `${global.__MONGO_URI__}`
process.env.MONGO_URL = url

beforeAll(async () => {
  const connection = getMongoConnection({name: 'main'})
  await connection.connectionPromise
})

afterAll(async () => {
  /**
   * We need to wait on indexes promises to be resolved to close all the handlers
   */
  await Promise.all(createIndexesPromises)

  for (const connectionName in connections) {
    const connection = connections[connectionName]
    await connection.client.close()
  }
})
