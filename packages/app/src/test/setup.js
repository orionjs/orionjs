const {default: MongodbMemoryServer} = require('mongodb-memory-server')
const connect = require('../database/connect')

const MONGO_DB_NAME = 'jest'
const mongod = new MongodbMemoryServer({
  instance: {
    dbName: MONGO_DB_NAME
  }
})

global.MONGOD = mongod

module.exports = async function() {
  process.env.MONGO_URL = await mongod.getConnectionString()

  global.MONGODB_DB = await connect()
}
