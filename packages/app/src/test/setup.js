const {default: MongodbMemoryServer} = require('mongodb-memory-server')
const connect = require('../database/connect')

module.exports = async function() {
  const MONGO_DB_NAME = 'jest'
  const mongod = new MongodbMemoryServer({
    instance: {
      dbName: MONGO_DB_NAME
    },
    autoStart: true
  })

  global.MONGOD = mongod

  process.env.MONGO_URL = await mongod.getConnectionString()

  global.MONGODB_DB = await connect()
}
