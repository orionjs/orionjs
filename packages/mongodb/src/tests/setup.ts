import {connect} from '../connect'
import {connections} from '../connect/connections'

beforeAll(async () => {
  const url = `${global.__MONGO_URI__}jest`

  const connection = connect(url)
  await connection.connectionPromise
})

afterAll(async () => {
  for (const connectionName in connections) {
    const connection = connections[connectionName]
    await connection.client.close()
  }
})
