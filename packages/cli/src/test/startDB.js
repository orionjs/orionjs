import {MongoMemoryServer} from 'mongodb-memory-server'

export default async function () {
  const mongod = new MongoMemoryServer({
    binary: {
      version: process.env.MONGO_TESTS_VERSION || '4.2.10'
    }
  })
  mongod.getInstanceInfo() // return Object with instance data

  return {
    mongod,
    uri: await mongod.getUri()
  }
}
