import {MongoClient} from 'mongodb'

const uri = process.env.MONGO_URL
if (!uri) {
  throw new Error('Mongo URL env is required')
}

let database = null

export default async function() {
  if (database) return database
  const client = await MongoClient.connect(uri)
  const dbName = client.s.options.dbName
  database = client.db(dbName)
  return database
}
