const {MongoMemoryServer} = require('mongodb-memory-server')
const connect = require('../database/connect')

module.exports = async function () {
  const MONGO_DB_NAME = 'jest'
  const mongod = new MongoMemoryServer({
    instance: {
      dbName: MONGO_DB_NAME
    },
    autoStart: true
  })

  global.MONGOD = mongod
  await mongod.start()
  process.env.MONGO_URL = await mongod.getUri()
  global.MONGODB_DB = await connect()
}
