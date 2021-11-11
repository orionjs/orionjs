import {connect} from '@orion-js/mongodb'

const url = `${global.__MONGO_URI__}jest`
process.env.MONGO_URL = url
const connection = connect(url)

beforeAll(async () => {
  await connection.connectionPromise
})

beforeEach(async () => {
  const collections = await connection.db.collections()
  for (const collection of collections) {
    await collection.deleteMany({})
  }
})

afterAll(async () => {
  await connection.client.close()
})
