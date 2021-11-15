import {getMongoConnection} from '..'
import {connections} from '../connect/connections'

const url = `${global.__MONGO_URI__}jest`
process.env.MONGO_URL = url

beforeAll(async () => {
  const connection = getMongoConnection({name: 'main'})
  await connection.connectionPromise
})

afterAll(async () => {
  for (const connectionName in connections) {
    const connection = connections[connectionName]
    await connection.client.close()
  }
})
