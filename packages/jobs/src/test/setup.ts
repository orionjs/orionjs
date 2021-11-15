import {getMongoConnection} from '@orion-js/mongodb'

const url = `${global.__MONGO_URI__}jest`
process.env.MONGO_URL = url

beforeEach(async () => {
  const connection = getMongoConnection({name: 'main'})
  await connection.connectionPromise

  const collections = await connection.db.collections()
  for (const collection of collections) {
    await collection.deleteMany({})
  }
})

afterAll(async () => {
  const connection = getMongoConnection({name: 'main'})
  await connection.client.close()
})
