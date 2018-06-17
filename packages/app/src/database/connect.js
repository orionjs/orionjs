const {MongoClient} = require('mongodb')

global.orionMainDatabase = null
global.orionMainDatabaseClient = null

const resolvers = []
let connecting = false

const connect = async function() {
  connecting = true
  const uri = process.env.MONGO_URL
  if (!uri) {
    throw new Error('Mongo URL env is required')
  }

  const client = await MongoClient.connect(uri)

  const dbName = client.s.options.dbName
  global.orionMainDatabaseClient = client
  global.orionMainDatabase = client.db(dbName)
  for (const resolve of resolvers) {
    resolve(global.orionMainDatabase)
  }
  connecting = false
  return global.orionMainDatabase
}

module.exports = async function() {
  if (global.orionMainDatabase) return global.orionMainDatabase
  if (!connecting) {
    return await connect()
  }
  return new Promise(resolve => resolvers.push(resolve))
}
