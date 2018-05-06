const {MongoClient} = require('mongodb')

global.orionMainDatabase = null
global.orionMainDatabaseClient = null

module.exports = async function() {
  const uri = process.env.MONGO_URL
  if (!uri) {
    throw new Error('Mongo URL env is required')
  }

  if (global.orionMainDatabase) return global.orionMainDatabase
  const client = await MongoClient.connect(uri)
  const dbName = client.s.options.dbName
  global.orionMainDatabaseClient = client
  global.orionMainDatabase = client.db(dbName)
  return global.orionMainDatabase
}
