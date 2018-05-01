import {MongoClient} from 'mongodb'

const uri = process.env.MONGO_URL
if (!uri) {
  throw new Error('Mongo URL env is required')
}

global.orionMainDatabase = null

export default async function() {
  if (global.orionMainDatabase) return global.orionMainDatabase
  const client = await MongoClient.connect(uri)
  const dbName = client.s.options.dbName
  global.orionMainDatabase = client.db(dbName)
  return global.orionMainDatabase
}
